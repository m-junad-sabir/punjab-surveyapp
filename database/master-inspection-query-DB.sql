WITH column_details AS (
    SELECT 
        c.table_name,
        c.column_name,
        c.ordinal_position,
        c.data_type,
        COALESCE(c.character_maximum_length, c.numeric_precision) AS max_length,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_primary_key,
        CASE WHEN c.column_default LIKE 'nextval%' OR c.is_generated = 'ALWAYS' THEN 'YES' ELSE 'NO' END AS is_generated_id
    FROM information_schema.columns c
    LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name 
            AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    WHERE c.table_schema = 'public'
),
fk_details AS (
    SELECT 
        kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule AS on_update,
        rc.delete_rule AS on_delete
    FROM information_schema.table_constraints tc 
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc 
        ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
),
spatial_details AS (
    SELECT 
        f_table_name AS table_name,
        f_geometry_column AS column_name,
        type AS geometry_type,
        srid
    FROM geometry_columns
    where f_table_schema = 'public'
)
SELECT 
    cd.table_name,
    cd.column_name,
    cd.ordinal_position,
    cd.data_type,
    cd.max_length,
    cd.is_nullable,
    cd.column_default,
    cd.is_primary_key,
    cd.is_generated_id,
    fk.foreign_table_name,
    fk.foreign_column_name,
    fk.on_update,
    fk.on_delete,
    sp.geometry_type,
    sp.srid
FROM column_details cd
LEFT JOIN fk_details fk 
    ON cd.table_name = fk.table_name AND cd.column_name = fk.column_name
LEFT JOIN spatial_details sp 
    ON cd.table_name = sp.table_name AND cd.column_name = sp.column_name
ORDER BY cd.table_name, cd.ordinal_position;