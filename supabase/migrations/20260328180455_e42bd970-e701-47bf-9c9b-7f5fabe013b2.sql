
-- Ensure the "By Type" category exists with the expected UUID
INSERT INTO categories (id, name, slug, display_order, is_active)
VALUES ('bbc78efb-e0bc-42fa-abf2-b5d82c9b1468', 'By Type', 'by-type', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Enable show_in_tailored for existing matching subcategories
UPDATE subcategories SET show_in_tailored = true WHERE slug IN ('rose-bouquet', 'lilies-bouquet', 'tulips-bouquet');

-- Insert missing subcategories under "By Type" category
INSERT INTO subcategories (name, slug, category_id, is_active, show_in_tailored, display_order) VALUES
  ('Gift Combo', 'gift-combo', 'bbc78efb-e0bc-42fa-abf2-b5d82c9b1468', true, true, 10),
  ('Mixed Bouquet', 'mixed-bouquet', 'bbc78efb-e0bc-42fa-abf2-b5d82c9b1468', true, true, 11),
  ('Carnation Bouquet', 'carnation-bouquet', 'bbc78efb-e0bc-42fa-abf2-b5d82c9b1468', true, true, 12),
  ('Chocolate Bouquet', 'chocolate-bouquet', 'bbc78efb-e0bc-42fa-abf2-b5d82c9b1468', true, true, 13),
  ('Gerbera Bouquet', 'gerbera-bouquet', 'bbc78efb-e0bc-42fa-abf2-b5d82c9b1468', true, true, 14),
  ('Sunflower Bouquet', 'sunflower-bouquet', 'bbc78efb-e0bc-42fa-abf2-b5d82c9b1468', true, true, 15);

