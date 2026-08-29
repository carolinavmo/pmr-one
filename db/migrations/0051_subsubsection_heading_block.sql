-- A third heading tier, one step lighter than subsection_heading —
-- lets a document's Heading 1/2/3 levels map 1:1 onto this platform's
-- own heading blocks (section_heading / subsection_heading /
-- subsubsection_heading) instead of collapsing levels 2 and 3
-- together. Same non-indexed behaviour as subsection_heading: every
-- index query (getSectionSummaries, getSectionIndex, splitIntoSections)
-- keys strictly on block_type = 'section_heading', so this type is
-- excluded automatically, no other schema change needed.
ALTER TYPE editorial_block_type ADD VALUE 'subsubsection_heading';
