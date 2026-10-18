/**
 * Clean & Minimal Dynamic Restaurant Menu
 * Focus: High Usability, Instant Menu Recognition & Scannable Price Lists
 * 100% Data-Driven via menu.json
 */

(function () {
  'use strict';

  // Global state
  let menuData = null;
  let activeCategoryId = null;
  let activeFilter = 'all';
  let activeSort = 'default';
  let isCompactView = false;
  let originalItemOrders = new Map(); // Store default item DOM order

  // DOM Elements
  const restaurantNameEl = document.getElementById('restaurant-name');
  const restaurantTaglineEl = document.getElementById('restaurant-tagline');
  const brandLetterEl = document.getElementById('brand-letter');
  const hoursTextEl = document.getElementById('hours-text');
  const addressTextEl = document.getElementById('address-text');
  const phoneLinkEl = document.getElementById('phone-link');
  const phoneTextEl = document.getElementById('phone-text');
  const statCatCountEl = document.getElementById('stat-cat-count');
  const statDishCountEl = document.getElementById('stat-dish-count');
  const statPriceRangeEl = document.getElementById('stat-price-range');

  const footerNoticeEl = document.getElementById('footer-notice');
  const footerBrandEl = document.getElementById('footer-brand');
  const currentYearEl = document.getElementById('current-year');

  const stickyNav = document.getElementById('sticky-nav');
  const categoryTabsEl = document.getElementById('category-tabs');
  const menuContainerEl = document.getElementById('menu-container');

  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchResultsInfo = document.getElementById('search-results-info');
  const quickFilterContainer = document.getElementById('quick-filter-chips');

  const btnViewDetailed = document.getElementById('btn-view-detailed');
  const btnViewCompact = document.getElementById('btn-view-compact');
  const sortDropdown = document.getElementById('sort-dropdown');

  const backToTopBtn = document.getElementById('back-to-top');
  const floatingCatBtn = document.getElementById('floating-cat-btn');
  const drawerBackdrop = document.getElementById('category-drawer-backdrop');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerCategoriesList = document.getElementById('drawer-categories-list');

  // Set current year in footer
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // =========================================================================
  // 1. Fetch menu.json with Cache-Busting
  // =========================================================================
  async function loadMenuData() {
    try {
      const response = await fetch('./menu.json?t=' + Date.now());
      if (!response.ok) {
        throw new Error(`Failed to load menu.json: HTTP ${response.status}`);
      }
      menuData = await response.json();
      renderMenu();
    } catch (err) {
      console.error('Error fetching menu.json:', err);
      renderErrorState(err.message);
    }
  }

  // =========================================================================
  // 2. Render Error / Retry State
  // =========================================================================
  function renderErrorState(errorMessage) {
    menuContainerEl.innerHTML = `
      <div class="no-results-card">
        <h3>Unable to Load Menu</h3>
        <p>Could not retrieve <code>menu.json</code>. Please verify the file is present in the project root.</p>
        <p style="font-size:0.75rem; color:#888; margin-top:0.5rem;">${escapeHtml(errorMessage)}</p>
        <button type="button" class="btn-reset-search" id="btn-retry-load">Retry Loading</button>
      </div>
    `;
    const retryBtn = document.getElementById('btn-retry-load');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        menuContainerEl.innerHTML = `
          <div class="menu-loader">
            <div class="loader-spinner"></div>
            <p>Retrying connection...</p>
          </div>
        `;
        loadMenuData();
      });
    }
  }

  // =========================================================================
  // 3. Helper: Extract Category Icon
  // =========================================================================
  function getCategoryIcon(cat) {
    if (cat.icon && cat.icon.trim()) return cat.icon.trim();
    const id = (cat.id || '').toLowerCase();
    const name = (cat.name || '').toLowerCase();
    if (id.includes('burger') || name.includes('burger')) return '🍔';
    if (id.includes('roll') || name.includes('roll') || name.includes('wrap')) return '🌯';
    if (id.includes('bbq') || name.includes('bbq') || name.includes('grill')) return '🔥';
    if (id.includes('karahi') || name.includes('karahi') || name.includes('curry')) return '🍲';
    if (id.includes('dessert') || name.includes('sweet') || name.includes('cake')) return '🍰';
    if (id.includes('pizza') || name.includes('pizza')) return '🍕';
    if (id.includes('drink') || name.includes('beverage')) return '🥤';
    if (id.includes('favorite') || name.includes('favorite') || name.includes('chef')) return '⭐';
    return '🍽️';
  }

  // =========================================================================
  // 4. Render Entire Website Dynamically
  // =========================================================================
  function renderMenu() {
    if (!menuData) return;

    const { restaurant, categories, favorites } = menuData;
    const currency = restaurant.currency || 'Rs. ';

    // Populate Restaurant Info
    document.title = `${restaurant.name || 'Restaurant'} — Digital Menu`;
    if (restaurantNameEl) restaurantNameEl.textContent = restaurant.name || 'Restaurant Menu';
    if (restaurantTaglineEl) restaurantTaglineEl.textContent = restaurant.tagline || 'Dining & Takeaway Menu';
    
    // First letter monogram
    if (brandLetterEl && restaurant.name) {
      brandLetterEl.textContent = restaurant.name.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() || 'M';
    }

    if (hoursTextEl) hoursTextEl.textContent = restaurant.hours || 'Open Daily · 5:00 PM – 2:00 AM';
    if (addressTextEl) addressTextEl.textContent = restaurant.address || 'Dining Room';
    if (restaurant.phone && phoneLinkEl) {
      phoneLinkEl.href = `tel:${restaurant.phone.replace(/[^0-9+]/g, '')}`;
      if (phoneTextEl) phoneTextEl.textContent = `Call ${restaurant.phone}`;
    }

    if (footerNoticeEl && restaurant.notice) footerNoticeEl.textContent = restaurant.notice;
    if (footerBrandEl && restaurant.name) {
      footerBrandEl.innerHTML = `&copy; ${new Date().getFullYear()} ${escapeHtml(restaurant.name)} · Digital Dining Menu`;
    }

    // Collect all Favorite items from categories
    const allFavoriteItems = [];
    let allPrices = [];
    let totalDishCount = 0;

    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        if (Array.isArray(cat.items)) {
          cat.items.forEach(item => {
            totalDishCount++;
            if (typeof item.price === 'number') {
              allPrices.push(item.price);
            }
            if (item.isFavorite) {
              allFavoriteItems.push({
                ...item,
                categoryName: cat.name
              });
            }
          });
        }
      });
    }

    // Calculate Overall Menu Statistics
    const catCount = Array.isArray(categories) ? categories.length : 0;
    if (statCatCountEl) statCatCountEl.textContent = catCount;
    if (statDishCountEl) statDishCountEl.textContent = totalDishCount;

    if (allPrices.length > 0 && statPriceRangeEl) {
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);
      statPriceRangeEl.textContent = `${currency}${minPrice.toLocaleString()} – ${currency}${maxPrice.toLocaleString()}`;
    }

    // Build Category Tabs & Sections
    let tabsHtml = '';
    let sectionsHtml = '';
    const drawerListItems = [];

    // A. "Chef's Favorites" Section
    const hasFavorites = allFavoriteItems.length > 0;
    if (hasFavorites) {
      const favConfig = favorites || {
        id: 'favorites',
        name: "Chef's Favorites",
        icon: "⭐",
        description: 'Our most celebrated house specialties, flame-grilled and loved by our regular guests.',
        image: 'images/favorites.jpg'
      };

      const favIcon = getCategoryIcon(favConfig);
      const favPrices = allFavoriteItems.map(i => i.price).filter(p => typeof p === 'number');
      const favMin = favPrices.length ? Math.min(...favPrices) : 0;
      const favMax = favPrices.length ? Math.max(...favPrices) : 0;

      tabsHtml += `
        <button type="button" class="nav-tab-btn active" data-target="section-favorites">
          <span class="badge-icon">${favIcon}</span> ${escapeHtml(favConfig.name || "Chef's Favorites")}
        </button>
      `;

      sectionsHtml += createCategorySectionHtml({
        id: 'section-favorites',
        name: favConfig.name || "Chef's Favorites",
        icon: favIcon,
        description: favConfig.description || 'Our most celebrated house specialties.',
        image: favConfig.image || 'images/favorites.jpg',
        items: allFavoriteItems,
        isFavoritesSection: true,
        currency,
        minPrice: favMin,
        maxPrice: favMax
      });

      drawerListItems.push({
        id: 'section-favorites',
        name: favConfig.name || "Chef's Favorites",
        icon: favIcon,
        count: allFavoriteItems.length,
        priceRange: favMin && favMax ? `${currency}${favMin.toLocaleString()} – ${currency}${favMax.toLocaleString()}` : ''
      });
    }

    // B. Main Category Sections
    if (Array.isArray(categories)) {
      categories.forEach((cat, index) => {
        const sectionId = `category-${cat.id || index}`;
        const isFirstActive = !hasFavorites && index === 0;
        const icon = getCategoryIcon(cat);
        const catPrices = (cat.items || []).map(i => i.price).filter(p => typeof p === 'number');
        const catMin = catPrices.length ? Math.min(...catPrices) : 0;
        const catMax = catPrices.length ? Math.max(...catPrices) : 0;

        tabsHtml += `
          <button type="button" class="nav-tab-btn ${isFirstActive ? 'active' : ''}" data-target="${sectionId}">
            <span class="badge-icon">${icon}</span> ${escapeHtml(cat.name)}
          </button>
        `;

        sectionsHtml += createCategorySectionHtml({
          id: sectionId,
          name: cat.name,
          icon,
          description: cat.description || '',
          image: cat.image,
          items: cat.items || [],
          isFavoritesSection: false,
          currency,
          minPrice: catMin,
          maxPrice: catMax
        });

        drawerListItems.push({
          id: sectionId,
          name: cat.name,
          icon,
          count: (cat.items || []).length,
          priceRange: catMin && catMax ? `${currency}${catMin.toLocaleString()} – ${currency}${catMax.toLocaleString()}` : ''
        });
      });
    }

    // Inject into DOM
    categoryTabsEl.innerHTML = tabsHtml;
    menuContainerEl.innerHTML = sectionsHtml;

    // Build Drawer Categories List
    renderDrawerCategories(drawerListItems);

    // Save default order of items per category for sort resetting
    saveDefaultItemOrders();

    // Attach Event Handlers & Features
    attachTabClickHandlers();
    attachImageErrorFallbacks();
    setupScrollSpy();
    setupViewModeToggle();
    setupSortControl();
    setupQuickFilters();
    setupCategoryDrawer();
  }

  // =========================================================================
  // 5. HTML Generator for a Category Section
  // =========================================================================
  function createCategorySectionHtml({ id, name, icon, description, image, items, isFavoritesSection, currency, minPrice, maxPrice }) {
    const itemCountText = `${items.length} ${items.length === 1 ? 'Dish' : 'Dishes'}`;
    const priceRangeText = minPrice && maxPrice 
      ? `${currency}${minPrice.toLocaleString()} – ${currency}${maxPrice.toLocaleString()}` 
      : '';

    // Items list HTML
    const itemsHtml = items.map(item => createFoodItemHtml(item, currency, isFavoritesSection)).join('');

    return `
      <section class="category-section" id="${id}" data-category-name="${escapeHtml(name)}">
        <!-- Dynamic Category Banner Image -->
        <div class="category-banner-wrapper">
          ${image && image.trim() ? `
          <img 
            class="category-banner-img" 
            src="${escapeHtml(image.trim())}" 
            alt="${escapeHtml(name)} banner"
            loading="lazy"
            onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.classList.remove('hidden');"
          >
          <div class="category-banner-fallback hidden">
            <svg class="fallback-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 2v20M6 2v20M12 2v20M6 7h12M6 17h12"></path>
            </svg>
            <span class="fallback-title">${escapeHtml(name)}</span>
          </div>
          ` : `
          <div class="category-banner-fallback">
            <svg class="fallback-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 2v20M6 2v20M12 2v20M6 7h12M6 17h12"></path>
            </svg>
            <span class="fallback-title">${escapeHtml(name)}</span>
          </div>
          `}
        </div>

        <!-- Category Title & Price Range Info Header -->
        <div class="category-info">
          <div class="category-header-top">
            <h2 class="category-title">
              <span class="category-icon" aria-hidden="true">${icon}</span>
              <span>${escapeHtml(name)}</span>
            </h2>
            <div class="category-header-badges">
              <span class="category-item-count">${itemCountText}</span>
              ${priceRangeText ? `<span class="category-price-range" title="Price Range in this section">${priceRangeText}</span>` : ''}
            </div>
          </div>
          ${description ? `<p class="category-description">${escapeHtml(description)}</p>` : ''}
        </div>

        <!-- Text-Based Food Items List with Dotted Leaders & Highlighted Prices -->
        <div class="items-list">
          ${itemsHtml}
        </div>
      </section>
    `;
  }

  // =========================================================================
  // 6. HTML Generator for Individual Food Items (Highly Scannable Prices)
  // =========================================================================
  function createFoodItemHtml(item, currency, isFavoritesSection) {
    const isAvailable = item.available !== false;
    const priceNum = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
    const formattedPriceNumber = priceNum.toLocaleString();

    // Dietary & Special Tags
    let tagsHtml = '';
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      tagsHtml = `
        <div class="food-item-tags">
          ${item.tags.map(tag => {
            const lower = tag.toLowerCase();
            let extraClass = '';
            let icon = '';
            if (lower.includes('veg')) {
              extraClass = 'tag-veg';
              icon = '🌱 ';
            } else if (lower.includes('spicy') || lower.includes('hot')) {
              extraClass = 'tag-spicy';
              icon = '🌶️ ';
            } else if (lower.includes('chef') || lower.includes('favorite') || lower.includes('special')) {
              icon = '⭐ ';
            }
            return `<span class="tag-pill ${extraClass}">${icon}${escapeHtml(tag)}</span>`;
          }).join('')}
        </div>
      `;
    }

    return `
      <article 
        class="food-item ${!isAvailable ? 'is-sold-out' : ''}" 
        data-item-id="${escapeHtml(item.id || '')}"
        data-item-price="${priceNum}"
        data-item-name="${escapeHtml(item.name || '').toLowerCase()}"
        data-item-desc="${escapeHtml(item.description || '').toLowerCase()}"
        data-item-tags="${escapeHtml((item.tags || []).join(' ')).toLowerCase()}"
        data-is-fav="${item.isFavorite ? 'true' : 'false'}"
        data-is-available="${isAvailable ? 'true' : 'false'}"
      >
        <div class="food-item-header">
          <div class="food-item-title-col">
            <div class="food-item-name-row">
              <h3 class="food-item-name">${escapeHtml(item.name)}</h3>
              <div class="food-item-status-badges">
                ${item.isFavorite && !isFavoritesSection ? '<span class="favorite-pill"><span class="fav-star">★</span> Chef\'s Pick</span>' : ''}
                ${!isAvailable ? '<span class="sold-out-badge">Sold Out</span>' : ''}
              </div>
            </div>
          </div>
          <!-- Classical Menu Dotted Leader Line to Price -->
          <div class="food-item-dots" aria-hidden="true"></div>
          <!-- Prominent High-Contrast Price Badge -->
          <div class="food-item-price-col">
            <div class="food-item-price-badge" title="Price: ${currency}${formattedPriceNumber}">
              <span class="price-currency">${escapeHtml(currency)}</span>
              <span class="price-amount">${formattedPriceNumber}</span>
            </div>
          </div>
        </div>
        ${item.description ? `<p class="food-item-desc">${escapeHtml(item.description)}</p>` : ''}
        ${tagsHtml}
      </article>
    `;
  }

  // =========================================================================
  // 7. Save Default Orders of Items for Sort Resetting
  // =========================================================================
  function saveDefaultItemOrders() {
    originalItemOrders.clear();
    const lists = menuContainerEl.querySelectorAll('.items-list');
    lists.forEach((list, index) => {
      const items = Array.from(list.querySelectorAll('.food-item'));
      originalItemOrders.set(list, items);
    });
  }

  // =========================================================================
  // 8. View Mode Switcher (Detailed Cards vs. Quick Price List)
  // =========================================================================
  function setupViewModeToggle() {
    if (!btnViewDetailed || !btnViewCompact) return;

    // Check saved preference
    const savedMode = localStorage.getItem('menu_view_mode');
    if (savedMode === 'compact') {
      applyViewMode(true);
    }

    btnViewDetailed.addEventListener('click', () => {
      applyViewMode(false);
    });

    btnViewCompact.addEventListener('click', () => {
      applyViewMode(true);
    });
  }

  function applyViewMode(compact) {
    isCompactView = compact;
    if (compact) {
      menuContainerEl.classList.add('view-mode-compact');
      btnViewCompact.classList.add('active');
      btnViewCompact.setAttribute('aria-pressed', 'true');
      btnViewDetailed.classList.remove('active');
      btnViewDetailed.setAttribute('aria-pressed', 'false');
      localStorage.setItem('menu_view_mode', 'compact');
    } else {
      menuContainerEl.classList.remove('view-mode-compact');
      btnViewDetailed.classList.add('active');
      btnViewDetailed.setAttribute('aria-pressed', 'true');
      btnViewCompact.classList.remove('active');
      btnViewCompact.setAttribute('aria-pressed', 'false');
      localStorage.setItem('menu_view_mode', 'detailed');
    }
  }

  // =========================================================================
  // 9. Sorting by Price & Name
  // =========================================================================
  function setupSortControl() {
    if (!sortDropdown) return;

    sortDropdown.addEventListener('change', () => {
      activeSort = sortDropdown.value;
      applySorting();
    });
  }

  function applySorting() {
    const lists = menuContainerEl.querySelectorAll('.items-list');

    lists.forEach(list => {
      let items = Array.from(list.querySelectorAll('.food-item'));

      if (activeSort === 'price-asc') {
        items.sort((a, b) => {
          const pA = parseFloat(a.getAttribute('data-item-price')) || 0;
          const pB = parseFloat(b.getAttribute('data-item-price')) || 0;
          return pA - pB;
        });
      } else if (activeSort === 'price-desc') {
        items.sort((a, b) => {
          const pA = parseFloat(a.getAttribute('data-item-price')) || 0;
          const pB = parseFloat(b.getAttribute('data-item-price')) || 0;
          return pB - pA;
        });
      } else if (activeSort === 'name-asc') {
        items.sort((a, b) => {
          const nA = a.getAttribute('data-item-name') || '';
          const nB = b.getAttribute('data-item-name') || '';
          return nA.localeCompare(nB);
        });
      } else {
        // Restore default order
        const defaults = originalItemOrders.get(list);
        if (defaults) {
          items = defaults;
        }
      }

      // Re-append items in new order
      items.forEach(item => list.appendChild(item));
    });
  }

  // =========================================================================
  // 10. Quick Dietary & Budget Filters
  // =========================================================================
  function setupQuickFilters() {
    if (!quickFilterContainer) return;

    const chips = quickFilterContainer.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-filter') || 'all';
        applyCombinedFilterAndSearch();
      });
    });
  }

  // =========================================================================
  // 11. Instant Search & Price Search
  // =========================================================================
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyCombinedFilterAndSearch();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.classList.add('hidden');
      searchResultsInfo.classList.add('hidden');
      applyCombinedFilterAndSearch();
      searchInput.focus();
    });
  }

  function applyCombinedFilterAndSearch() {
    if (!menuContainerEl) return;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const numericQuery = parseFloat(query);
    const isNumericSearch = !isNaN(numericQuery) && numericQuery > 0;

    const sections = menuContainerEl.querySelectorAll('.category-section');
    let totalMatchingDishes = 0;

    if (query) {
      searchClearBtn.classList.remove('hidden');
    } else {
      searchClearBtn.classList.add('hidden');
    }

    sections.forEach(section => {
      const items = section.querySelectorAll('.food-item');
      let matchingCountInSec = 0;

      items.forEach(item => {
        const name = item.getAttribute('data-item-name') || '';
        const desc = item.getAttribute('data-item-desc') || '';
        const tags = item.getAttribute('data-item-tags') || '';
        const price = parseFloat(item.getAttribute('data-item-price')) || 0;
        const isFav = item.getAttribute('data-is-fav') === 'true';
        const categoryName = (section.getAttribute('data-category-name') || '').toLowerCase();

        // 1. Check quick dietary / budget filter
        let passesFilter = true;
        if (activeFilter === 'fav') {
          passesFilter = isFav;
        } else if (activeFilter === 'under1000') {
          passesFilter = price < 1000;
        } else if (activeFilter === '1000to2000') {
          passesFilter = price >= 1000 && price <= 2000;
        } else if (activeFilter === 'spicy') {
          passesFilter = tags.includes('spicy') || tags.includes('hot');
        } else if (activeFilter === 'veg') {
          passesFilter = tags.includes('veg');
        }

        // 2. Check search query
        let passesSearch = true;
        if (query) {
          const textMatch = name.includes(query) || desc.includes(query) || tags.includes(query) || categoryName.includes(query);
          const priceMatch = isNumericSearch && (price === numericQuery || Math.abs(price - numericQuery) < 1);
          passesSearch = textMatch || priceMatch;
        }

        if (passesFilter && passesSearch) {
          item.classList.remove('hidden');
          matchingCountInSec++;
          totalMatchingDishes++;
        } else {
          item.classList.add('hidden');
        }
      });

      // If category has no matching dishes, hide category card
      if (matchingCountInSec === 0) {
        section.classList.add('hidden');
      } else {
        section.classList.remove('hidden');
      }
    });

    // Update search/filter status message
    if (query || activeFilter !== 'all') {
      searchResultsInfo.classList.remove('hidden');
      const filterLabel = activeFilter !== 'all' ? ` [Filtered: ${activeFilter}]` : '';
      if (totalMatchingDishes > 0) {
        searchResultsInfo.textContent = `Showing ${totalMatchingDishes} matching ${totalMatchingDishes === 1 ? 'dish' : 'dishes'}${filterLabel}`;
        removeNoResultsCard();
      } else {
        searchResultsInfo.textContent = `No dishes found${query ? ` for "${query}"` : ''}${filterLabel}`;
        renderNoResultsCard(query || activeFilter);
      }
    } else {
      searchResultsInfo.classList.add('hidden');
      removeNoResultsCard();
    }
  }

  function renderNoResultsCard(query) {
    removeNoResultsCard();
    const card = document.createElement('div');
    card.id = 'search-no-results';
    card.className = 'no-results-card';
    card.innerHTML = `
      <h3>No Dishes Found</h3>
      <p>We couldn't find any dishes matching <strong>"${escapeHtml(query)}"</strong>.</p>
      <button type="button" class="btn-reset-search" id="btn-clear-search-result">View All Dishes</button>
    `;
    menuContainerEl.appendChild(card);
    const clearBtn = document.getElementById('btn-clear-search-result');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        activeFilter = 'all';
        const chips = quickFilterContainer ? quickFilterContainer.querySelectorAll('.filter-chip') : [];
        chips.forEach(c => {
          if (c.getAttribute('data-filter') === 'all') c.classList.add('active');
          else c.classList.remove('active');
        });
        applyCombinedFilterAndSearch();
      });
    }
  }

  function removeNoResultsCard() {
    const existing = document.getElementById('search-no-results');
    if (existing) existing.remove();
  }

  // =========================================================================
  // 12. Category Quick Jump Drawer Modal
  // =========================================================================
  function renderDrawerCategories(categoriesList) {
    if (!drawerCategoriesList) return;

    drawerCategoriesList.innerHTML = categoriesList.map(cat => `
      <div class="drawer-item" data-target="${cat.id}">
        <div class="drawer-item-left">
          <span class="drawer-item-icon">${cat.icon}</span>
          <span class="drawer-item-name">${escapeHtml(cat.name)}</span>
        </div>
        <div class="drawer-item-right">
          <span class="drawer-item-count">${cat.count} dishes</span>
          ${cat.priceRange ? `<span class="drawer-item-price">${cat.priceRange}</span>` : ''}
        </div>
      </div>
    `).join('');

    // Attach click handlers to drawer items
    const items = drawerCategoriesList.querySelectorAll('.drawer-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        closeCategoryDrawer();
        scrollToSection(targetId);
      });
    });
  }

  function setupCategoryDrawer() {
    if (floatingCatBtn) {
      floatingCatBtn.addEventListener('click', openCategoryDrawer);
    }
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', closeCategoryDrawer);
    }
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', e => {
        if (e.target === drawerBackdrop) {
          closeCategoryDrawer();
        }
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawerBackdrop && !drawerBackdrop.classList.contains('hidden')) {
        closeCategoryDrawer();
      }
    });
  }

  function openCategoryDrawer() {
    if (!drawerBackdrop) return;
    drawerBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function closeCategoryDrawer() {
    if (!drawerBackdrop) return;
    drawerBackdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function scrollToSection(targetId) {
    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    // Clear search if any so user can see the full section
    if (searchInput && searchInput.value.trim().length > 0) {
      searchInput.value = '';
      applyCombinedFilterAndSearch();
    }

    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update active tab
    const tabs = categoryTabsEl.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-target') === targetId) {
        tab.classList.add('active');
        scrollTabIntoView(tab);
      } else {
        tab.classList.remove('active');
      }
    });
  }

  // =========================================================================
  // 13. Sticky Category Bar Navigation
  // =========================================================================
  function attachTabClickHandlers() {
    const tabs = categoryTabsEl.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        const targetId = tab.getAttribute('data-target');
        scrollToSection(targetId);
      });
    });
  }

  function scrollTabIntoView(tab) {
    if (!categoryTabsEl || !tab) return;
    const tabLeft = tab.offsetLeft;
    const tabWidth = tab.offsetWidth;
    const containerWidth = categoryTabsEl.clientWidth;
    const targetScroll = tabLeft - (containerWidth / 2) + (tabWidth / 2);
    categoryTabsEl.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }

  // =========================================================================
  // 14. ScrollSpy & Sticky Shadow
  // =========================================================================
  function setupScrollSpy() {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateScrollSpy();
          handleStickyShadow();
          handleBackToTopVisibility();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  function handleStickyShadow() {
    if (!stickyNav) return;
    if (window.scrollY > 120) {
      stickyNav.classList.add('is-stuck');
    } else {
      stickyNav.classList.remove('is-stuck');
    }
  }

  function handleBackToTopVisibility() {
    if (!backToTopBtn) return;
    if (window.scrollY > 300) {
      backToTopBtn.classList.remove('hidden');
    } else {
      backToTopBtn.classList.add('hidden');
    }
  }

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function updateScrollSpy() {
    if (searchInput && searchInput.value.trim().length > 0) return;

    const sections = menuContainerEl.querySelectorAll('.category-section:not(.hidden)');
    const scrollPos = window.scrollY + 120; // Offset for sticky nav & toolbar

    let currentSectionId = null;
    sections.forEach(section => {
      if (section.offsetTop <= scrollPos) {
        currentSectionId = section.id;
      }
    });

    if (currentSectionId && currentSectionId !== activeCategoryId) {
      activeCategoryId = currentSectionId;
      const tabs = categoryTabsEl.querySelectorAll('.nav-tab-btn');
      tabs.forEach(tab => {
        if (tab.getAttribute('data-target') === currentSectionId) {
          tab.classList.add('active');
          scrollTabIntoView(tab);
        } else {
          tab.classList.remove('active');
        }
      });
    }
  }

  // =========================================================================
  // 15. Graceful Image Fallback (No Broken Icons)
  // =========================================================================
  function attachImageErrorFallbacks() {
    const bannerImages = menuContainerEl.querySelectorAll('.category-banner-img');
    bannerImages.forEach(img => {
      img.addEventListener('error', function () {
        this.style.display = 'none';
        const fallback = this.nextElementSibling;
        if (fallback && fallback.classList.contains('category-banner-fallback')) {
          fallback.classList.remove('hidden');
        }
      });
      if (img.complete && img.naturalWidth === 0) {
        img.dispatchEvent(new Event('error'));
      }
    });
  }

  // =========================================================================
  // 16. Sanitization Helper
  // =========================================================================
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', loadMenuData);
})();
