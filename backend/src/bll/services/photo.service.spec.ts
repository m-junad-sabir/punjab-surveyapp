import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PhotoService } from './photo.service';
import { PhotoStorageService } from './photo-storage.service';

const responseId = '12345678-1234-4234-8234-123456789012';
const photoId = '87654321-1234-4234-8234-123456789012';
const photoTypes = ['L_PHOTO_INTERVIEW_SESSION', 'L_PHOTO_ENTRANCE_SIGNBOARD'];
const file = { buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]), mimetype: 'image/jpeg', size: 4 };
const metadata = {
  photo_id: photoId,
  response_id: responseId,
  photo_type: photoTypes[0],
  latitude: '31.5',
  longitude: '74.3',
  accuracy_m: '250',
  captured_at: '2026-11-02T00:00:00.000Z',
};

describe('Section L photo accuracy policy', () => {
  let query: jest.Mock;
  let save: jest.Mock;
  let service: PhotoService;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue([]);
    save = jest.fn().mockResolvedValue(undefined);
    service = new PhotoService(
      { query } as unknown as DataSource,
      { save, remove: jest.fn() } as unknown as PhotoStorageService,
    );
  });

  it.each(photoTypes.flatMap((type) =>
    [0, 50, 50.01, 100, 249.99, 250].map((accuracy) => [type, accuracy] as const),
  ))('accepts %s at %s m and persists its measured accuracy', async (type, accuracy) => {
    await expect(service.uploadPhoto(
      { ...metadata, photo_type: type, accuracy_m: String(accuracy) }, file, 'owner',
    )).resolves.toEqual({ photo_id: photoId, status: 'uploaded' });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO survey_photo_uploads'));
    expect(insert?.[1][9]).toBe(accuracy);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it.each(['-0.01', '250.001', '251', 'Infinity', 'NaN', '', ' '])(
    'rejects invalid accuracy %j before writing or storing a photo', async (accuracy) => {
      await expect(service.uploadPhoto(
        { ...metadata, accuracy_m: accuracy }, file, 'owner',
      )).rejects.toThrow(BadRequestException);
      expect(query).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    },
  );

  it.each([
    { latitude: '' }, { longitude: ' ' }, { latitude: '91' }, { longitude: '-181' },
    { latitude: undefined }, { accuracy_m: undefined }, { captured_at: '' },
  ])('requires capture location and time: %j', async (invalid) => {
    await expect(service.uploadPhoto({ ...metadata, ...invalid }, file, 'owner'))
      .rejects.toThrow(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('keeps JPEG, size, photo-type, UUID, and ownership restrictions', async () => {
    await expect(service.uploadPhoto(metadata, { ...file, mimetype: 'image/png' }, 'owner'))
      .rejects.toThrow('Only captured JPEG images');
    await expect(service.uploadPhoto(metadata, { ...file, size: 3145729 }, 'owner'))
      .rejects.toThrow('no larger than 3 MB');
    await expect(service.uploadPhoto({ ...metadata, photo_type: 'OTHER' }, file, 'owner'))
      .rejects.toThrow('Unknown photo evidence type');
    await expect(service.uploadPhoto({ ...metadata, photo_id: 'invalid' }, file, 'owner'))
      .rejects.toThrow('valid UUIDs');
    query.mockResolvedValue([{ uploaded_by: 'someone-else' }]);
    await expect(service.uploadPhoto(metadata, file, 'owner')).rejects.toThrow(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it.each(photoTypes)('attaches the owner-uploaded %s with its 250 m metadata', async (type) => {
    query.mockResolvedValueOnce([{ question_code: type }]).mockResolvedValueOnce([{
      ...metadata, photo_type: type, uploaded_by: 'owner', storage_key: 'photo.jpg',
      mime_type: 'image/jpeg', size_bytes: 4, sha256: 'abc',
      latitude: 31.5, longitude: 74.3, accuracy_m: 250,
    }]);
    await service.attachRequiredPhotos(
      { query } as unknown as EntityManager, 1, responseId, 'owner',
      new Map([[type, { photo_id: photoId }]]),
    );
    expect(query.mock.calls[1][1]).toEqual([photoId, responseId, 'owner', type]);
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO survey_attachments'));
    expect(insert?.[1][10]).toBe(250);
  });
});
