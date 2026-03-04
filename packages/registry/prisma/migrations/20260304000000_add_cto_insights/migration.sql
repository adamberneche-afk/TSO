-- Create CTO Insights table
CREATE TABLE IF NOT EXISTS "cto_insights" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    category text NOT NULL,
    wallet_address text,
    upvotes integer DEFAULT 0,
    status text DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cto_insights_status_idx" ON "cto_insights"(status);
CREATE INDEX IF NOT EXISTS "cto_insights_category_idx" ON "cto_insights"(category);
CREATE INDEX IF NOT EXISTS "cto_insights_created_at_idx" ON "cto_insights"(created_at);
