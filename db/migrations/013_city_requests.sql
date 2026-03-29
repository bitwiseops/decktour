-- City requests: users can request cities not yet available
CREATE TABLE public.city_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  city_name text NOT NULL,
  country text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  city_id uuid REFERENCES public.cities(id),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Prevent duplicate pending requests for same city
CREATE UNIQUE INDEX city_requests_unique_pending
  ON public.city_requests (lower(city_name), lower(country))
  WHERE status IN ('pending', 'processing');
