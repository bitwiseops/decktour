-- Migration 006 — Populate cover_url for seeded cities
-- Run in Supabase SQL Editor.

UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=75' WHERE name = 'Roma';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1610016302534-6f67f1c968d8?w=400&q=75' WHERE name = 'Milano';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1555992457-b8fefdd09069?w=400&q=75' WHERE name = 'Napoli';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1543429257-3eb0b65d9190?w=400&q=75' WHERE name = 'Firenze';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=400&q=75' WHERE name = 'Venezia';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75' WHERE name = 'Torino';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=400&q=75' WHERE name = 'Bologna';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1597935258735-84ef181ace4e?w=400&q=75' WHERE name = 'Palermo';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&q=75' WHERE name = 'Barcellona';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=75' WHERE name = 'Parigi';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=75' WHERE name = 'Londra';
UPDATE public.cities SET cover_url = 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=400&q=75' WHERE name = 'Amsterdam';

