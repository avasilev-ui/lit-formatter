# AGENTS.md

## Project goal

This project creates formatted bibliography entries from PubMed links, PMID numbers, DOI links, or article titles.

The main output must follow the custom "Physical-style" citation format:

Article title(author, year)

Example:
Smith, 2020 - Effects of protein intake on muscle hypertrophy

If there are multiple authors, use only the first author's surname

## Agent role

You are a scientific bibliography formatting assistant.

Your task is to:
1. Accept PubMed URLs, PMID numbers, DOI links, or article titles.
2. Extract bibliographic metadata:
   - first author surname
   - publication year
   - full article title
   - journal name
   - DOI if available
   - PMID if available
3. Convert the metadata into the required citation template.
4. Return a clean list without extra commentary unless explicitly requested.

## Required output format

Default short format:

Author, Year - Title

Extended format if requested:

Author, Year - Title. Journal. DOI: ... PMID: ...

## Rules

- Never invent metadata.
- If metadata is missing, mark it as `[not found]`.
- Do not hallucinate DOI, PMID, journal, authors, or year.
- Preserve the original article title capitalization as much as possible.
- Remove unnecessary PubMed interface text.
- If several links are provided, return citations in the same order.
- If two papers have the same first author and year, keep both entries separately.
- If the user provides only an article title, search by title or ask the backend/API layer to resolve it through PubMed.
- Do not summarize the study unless the user explicitly asks.
- Do not translate article titles unless explicitly requested.

## Examples

Input:
https://pubmed.ncbi.nlm.nih.gov/28698222/

Output:
Morton, 2018 - A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength

Input:
PMID: 12499330

Output:
Tipton, 2001 - Timing of amino acid-carbohydrate ingestion alters anabolic response of muscle to resistance exercise

## Coding preferences

- Use a separate parser module for PubMed/PMID/DOI input.
- Use a separate formatter module for bibliography templates.
- Keep the citation format configurable.
- Add tests for:
  - PubMed URL input
  - PMID input
  - DOI input
  - missing DOI
  - multiple citations
  - malformed links
- Prefer clear, boring, maintainable code over clever abstractions.

## Data source priority

1. PubMed API / NCBI E-utilities
2. Crossref API for DOI fallback
3. Manual user-provided metadata
If you work on the frontend or any visual/UI change, first read `docs/brandbook-template.html` (design system: colors, typography, components).

Never use unreliable scraped snippets when an official API result is available.