-- New block type: a lighter-weight heading an author can drop inside
-- an existing section without splitting it into its own SectionCard
-- and without appearing in the OnThisPage/sidebar index — every index
-- query (getSectionSummaries, getSectionIndex, splitIntoSections)
-- keys strictly on block_type = 'section_heading', so a distinct type
-- is excluded automatically, no other schema change needed.
ALTER TYPE editorial_block_type ADD VALUE 'subsection_heading';
