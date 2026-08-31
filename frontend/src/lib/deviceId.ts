import { v4 as uuidv4 } from 'uuid';

const KEY = 'survey_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `DEV-${uuidv4().substring(0, 8).toUpperCase()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
