-- Add foreign key constraint for vendedor_id to profiles
ALTER TABLE propostas
ADD CONSTRAINT propostas_vendedor_id_fkey
FOREIGN KEY (vendedor_id) REFERENCES profiles(id) ON DELETE RESTRICT;