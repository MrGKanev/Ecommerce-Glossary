// Ecommerce Glossary - Static Site JavaScript
(function() {
    'use strict';

    const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'numbers'];

    let allTerms = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // DOM Elements
    const searchInput = document.getElementById('search');
    const glossaryContainer = document.getElementById('glossary');
    const resultsCount = document.getElementById('results-count');
    const letterButtons = document.querySelectorAll('.letter-btn');

    // Initialize
    async function init() {
        await loadAllTerms();
        renderTerms();
        setupEventListeners();
    }

    // Load all markdown files
    async function loadAllTerms() {
        const promises = LETTERS.map(letter => loadLetterFile(letter));
        const results = await Promise.allSettled(promises);

        results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
                allTerms = allTerms.concat(result.value);
            }
        });

        // Sort alphabetically
        allTerms.sort((a, b) => a.term.localeCompare(b.term));
    }

    // Load and parse a single markdown file
    async function loadLetterFile(letter) {
        try {
            const response = await fetch(`letters/${letter}.md`);
            if (!response.ok) return [];

            const text = await response.text();
            return parseMarkdownTable(text, letter);
        } catch (error) {
            console.warn(`Could not load ${letter}.md:`, error);
            return [];
        }
    }

    // Parse markdown table to extract terms
    function parseMarkdownTable(markdown, letter) {
        const terms = [];
        const lines = markdown.split('\n');

        for (const line of lines) {
            // Skip header rows and separator rows
            if (!line.startsWith('|') || line.includes('---') || line.includes('Word')) {
                continue;
            }

            // Parse table row: |Term|Definition|Link|
            const cells = line.split('|').filter(cell => cell.trim());
            if (cells.length >= 2) {
                const term = cells[0].trim();
                let definition = cells[1].trim();
                let link = cells[2] ? cells[2].trim() : '';

                // Clean up definition (remove backticks and quotes)
                definition = definition
                    .replace(/^`["']?/, '')
                    .replace(/["']?`$/, '')
                    .replace(/^["']/, '')
                    .replace(/["']$/, '');

                // Parse link
                const linkMatch = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
                const linkUrl = linkMatch ? linkMatch[2] : null;
                const linkText = linkMatch ? linkMatch[1] : null;

                if (term && definition) {
                    terms.push({
                        term,
                        definition,
                        link: linkUrl,
                        linkText: linkText,
                        letter: letter === 'numbers' ? '#' : letter.toUpperCase()
                    });
                }
            }
        }

        return terms;
    }

    // Render terms to the DOM using safe methods
    function renderTerms() {
        let filteredTerms = allTerms;

        // Filter by letter
        if (currentFilter !== 'all') {
            const filterLetter = currentFilter === 'numbers' ? '#' : currentFilter.toUpperCase();
            filteredTerms = filteredTerms.filter(t => t.letter === filterLetter);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredTerms = filteredTerms.filter(t =>
                t.term.toLowerCase().includes(query) ||
                t.definition.toLowerCase().includes(query)
            );
        }

        // Update results count
        resultsCount.textContent = `Showing ${filteredTerms.length} of ${allTerms.length} terms`;

        // Clear container
        glossaryContainer.textContent = '';

        // Render no results message
        if (filteredTerms.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';

            const heading = document.createElement('h3');
            heading.textContent = 'No terms found';
            noResults.appendChild(heading);

            const message = document.createElement('p');
            message.textContent = 'Try a different search term or browse by letter.';
            noResults.appendChild(message);

            glossaryContainer.appendChild(noResults);
            return;
        }

        // Render term cards
        filteredTerms.forEach(term => {
            glossaryContainer.appendChild(createTermCard(term));
        });
    }

    // Create DOM element for a term card
    function createTermCard(term) {
        const article = document.createElement('article');
        article.className = 'term-card';

        // Header
        const header = document.createElement('div');
        header.className = 'term-header';

        const termName = document.createElement('h2');
        termName.className = 'term-name';
        highlightText(termName, term.term);
        header.appendChild(termName);

        const letterBadge = document.createElement('span');
        letterBadge.className = 'term-letter';
        letterBadge.textContent = term.letter;
        header.appendChild(letterBadge);

        article.appendChild(header);

        // Definition
        const definition = document.createElement('p');
        definition.className = 'term-definition';
        highlightText(definition, term.definition);
        article.appendChild(definition);

        // Link (if present and not just "-")
        if (term.link && term.link !== '-') {
            const linkContainer = document.createElement('div');
            linkContainer.className = 'term-link';

            const link = document.createElement('a');
            link.href = term.link;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = (term.linkText || 'Learn more') + ' →';
            linkContainer.appendChild(link);

            article.appendChild(linkContainer);
        }

        return article;
    }

    // Highlight search query in text (safe method)
    function highlightText(element, text) {
        if (!searchQuery) {
            element.textContent = text;
            return;
        }

        const query = searchQuery.toLowerCase();
        const lowerText = text.toLowerCase();
        let lastIndex = 0;

        while (true) {
            const index = lowerText.indexOf(query, lastIndex);
            if (index === -1) {
                // Add remaining text
                if (lastIndex < text.length) {
                    element.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                break;
            }

            // Add text before match
            if (index > lastIndex) {
                element.appendChild(document.createTextNode(text.slice(lastIndex, index)));
            }

            // Add highlighted match
            const span = document.createElement('span');
            span.className = 'highlight';
            span.textContent = text.slice(index, index + query.length);
            element.appendChild(span);

            lastIndex = index + query.length;
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Search input
        searchInput.addEventListener('input', debounce(function(e) {
            searchQuery = e.target.value.trim();
            renderTerms();
        }, 150));

        // Letter buttons
        letterButtons.forEach(button => {
            button.addEventListener('click', function() {
                currentFilter = this.dataset.letter;

                // Update active state and aria-pressed
                letterButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');

                renderTerms();
            });
        });

        // Keyboard shortcut: focus search on /
        document.addEventListener('keydown', function(e) {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Start the app
    init();
})();
