document.addEventListener('DOMContentLoaded', () => {
    const rawData = window.SCHOOL_DATA || [];
    
    // State
    let filteredData = [...rawData];
    let sortAsc = true;
    const MAX_RESULTS = 100; // Prevent mobile browser freezing

    // DOM Elements
    const districtSelect = document.getElementById('district-select');
    const blockSelect = document.getElementById('block-select');
    const searchInput = document.getElementById('search-input');
    const sortBtn = document.getElementById('sort-btn');
    const schoolList = document.getElementById('school-list');
    const resultsCount = document.getElementById('results-count');
    const loader = document.getElementById('loader');

    // Extract unique districts & blocks
    const districtsSet = new Set();
    const blocksByDistrict = {};

    rawData.forEach(school => {
        if (school.d && school.d.trim() !== "") {
            districtsSet.add(school.d);
            if (!blocksByDistrict[school.d]) blocksByDistrict[school.d] = new Set();
            if (school.b && school.b.trim() !== "") {
                blocksByDistrict[school.d].add(school.b);
            }
        }
    });

    // Initialize Dropdowns
    const districts = Array.from(districtsSet).sort();
    districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        districtSelect.appendChild(opt);
    });

    // Hide loader once ready
    loader.classList.add('hidden');
    
    // Functions
    function renderSchools() {
        schoolList.innerHTML = '';
        
        // Cap results for performance
        const toRender = filteredData.slice(0, MAX_RESULTS);
        
        if (filteredData.length === 0) {
            schoolList.innerHTML = '<div class="empty-state">No schools found matching your criteria.</div>';
            resultsCount.textContent = '0 schools found';
            return;
        }

        let countText = `${filteredData.length} school${filteredData.length > 1 ? 's' : ''} found.`;
        if (filteredData.length > MAX_RESULTS) {
            countText += ` (Showing top ${MAX_RESULTS})`;
        }
        resultsCount.textContent = countText;

        const fragment = document.createDocumentFragment();

        toRender.forEach((school, index) => {
            const card = document.createElement('div');
            card.className = 'school-card';
            card.style.animationDelay = `${index * 0.02}s`; // staggered animation
            
            let distClass = 'distance-badge';
            if (school.dist > 30) distClass += ' far';
            if (school.dist > 60) distClass += ' very-far';

            const distText = school.dist !== -1 ? `${school.dist} km to Station` : 'Unknown Distance';

            card.innerHTML = `
                <h3>${school.s}</h3>
                <div class="meta">
                    <span><i>Cluster:</i> ${school.c}</span>
                    <span><i>Block:</i> ${school.b}</span>
                </div>
                <div class="${distClass}">📍 ${distText}</div>
            `;
            fragment.appendChild(card);
        });

        schoolList.appendChild(fragment);
    }

    function applyFilters() {
        const distFilter = districtSelect.value;
        const blockFilter = blockSelect.value;
        const searchFilter = searchInput.value.toLowerCase();

        filteredData = rawData.filter(school => {
            let match = true;
            if (distFilter && school.d !== distFilter) match = false;
            if (blockFilter && school.b !== blockFilter) match = false;
            if (searchFilter) {
                const searchStr = `${school.s} ${school.c}`.toLowerCase();
                if (!searchStr.includes(searchFilter)) match = false;
            }
            return match;
        });

        // Sort by distance
        filteredData.sort((a, b) => {
            // Handle missing distances by pushing them to bottom
            if (a.dist === -1) return 1;
            if (b.dist === -1) return -1;
            
            return sortAsc ? a.dist - b.dist : b.dist - a.dist;
        });

        renderSchools();
    }

    // Event Listeners
    districtSelect.addEventListener('change', (e) => {
        const dist = e.target.value;
        
        // Reset and populate block select
        blockSelect.innerHTML = '<option value="">All Blocks</option>';
        if (dist) {
            blockSelect.disabled = false;
            const blocks = Array.from(blocksByDistrict[dist] || []).sort();
            blocks.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = b;
                blockSelect.appendChild(opt);
            });
        } else {
            blockSelect.disabled = true;
            blockSelect.innerHTML = '<option value="">Select a District First</option>';
        }
        
        applyFilters();
    });

    blockSelect.addEventListener('change', applyFilters);
    
    // Debounce search input
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });

    sortBtn.addEventListener('click', () => {
        sortAsc = !sortAsc;
        sortBtn.textContent = sortAsc ? 'Closest First ⬇️' : 'Furthest First ⬆️';
        applyFilters();
    });

    // Initial render
    applyFilters();
});
