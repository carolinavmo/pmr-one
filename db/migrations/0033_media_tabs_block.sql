-- A second, distinct tabs block: TabsBlock ('tabs') is a structured
-- phase/stage switcher (label/sublabel + checklist columns), not free
-- content. This one ('media_tabs') is the generic case a reader/author
-- actually asked for — each tab holds one optional image plus a rich
-- text body, same "image column + prose column" shape OverviewBlock
-- already uses, just repeated per tab instead of fixed to one.
ALTER TYPE editorial_block_type ADD VALUE IF NOT EXISTS 'media_tabs';
