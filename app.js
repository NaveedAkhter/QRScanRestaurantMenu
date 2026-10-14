/**
 * Clean & Minimal Dynamic Restaurant Menu
 * 100% Data-Driven via menu.json
 * Mobile-First Responsive Architecture
 */

(function () {
  'use strict';

  // Global state
  let menuData = null;
  let activeCategoryId = null;

  // DOM Elements
  const restaurantNameEl = document.getElementById('restaurant-name');
  const restaurantTaglineEl = document.getElementById('restaurant-tagline');
  const brandLetterEl = document.getElementById('brand-letter');
  const hoursTextEl = document.getElementById('hours-text');
  const addressTextEl = document.getElementById('address-text');
  const footerNoticeEl = document.getElementById('footer-notice');
  const footerBrandEl = document.getElementById('footer-brand');
  const currentYearEl = document.getElementById('current-year');
  const categoryTabsEl = document.getElementById('category-tabs');
  const menuContainerEl = document.getElementById('menu-container');
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchResultsInfo = document.getElementById('search-results-info');
  const backToTopBtn = document.getElementById('back-to-top');
  const stickyNav = document.getElementById('sticky-nav');

  // Set current year in footer
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // =========================================================================
  // 1. Fetch menu.json with Cache-Busting
  // =========================================================================
  async function loadMenuData() {
    try {
      // Date.now() cache-busting ensures instant updates when menu.json is edited
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
  // 3. Render Entire Website Dynamically
  // =========================================================================
  function renderMenu() {
    if (!menuData) return;

    const { restaurant, categories, favorites } = menuData;
    const currency = restaurant.currency || 'Rs. ';

    // Populate Restaurant Details
    document.title = `${restaurant.name || 'Restaurant'} — Menu`;
    if (restaurantNameEl) restaurantNameEl.textContent = restaurant.name || 'Bistro Menu';
    if (restaurantTaglineEl) restaurantTaglineEl.textContent = restaurant.tagline || '';
    
    // First letter monogram
    if (brandLetterEl && restaurant.name) {
      brandLetterEl.textContent = restaurant.name.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() || 'M';
    }

    if (hoursTextEl) hoursTextEl.textContent = restaurant.hours || 'Open Daily';
    if (addressTextEl) addressTextEl.textContent = restaurant.address || 'Dining Room';
    if (footerNoticeEl && restaurant.notice) footerNoticeEl.textContent = restaurant.notice;
    if (footerBrandEl && restaurant.name) {
      footerBrandEl.innerHTML = `&copy; ${new Date().getFullYear()} ${escapeHtml(restaurant.name)} · Digital Menu`;
    }

    // Collect all Favorite items from categories
    const allFavoriteItems = [];
    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        if (Array.isArray(cat.items)) {
          cat.items.forEach(item => {
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

    // Build Category Tabs & Sections
    let tabsHtml = '';
    let sectionsHtml = '';

    // A. "Our Favorites" Section (Only render if at least one item has isFavorite === true)
    const hasFavorites = allFavoriteItems.length > 0;
    if (hasFavorites) {
      const favConfig = favorites || {
        id: 'favorites',
        name: "Chef's Favorites",
        description: 'Standout signature dishes loved by our regular guests.',
        image: 'images/favorites.jpg'
      };

      tabsHtml += `
        <button type="button" class="nav-tab-btn active" data-target="section-favorites">
          <span class="badge-icon">★</span> ${escapeHtml(favConfig.name || "Chef's Favorites")}
        </button>
      `;

      sectionsHtml += createCategorySectionHtml({
        id: 'section-favorites',
        name: favConfig.name || "Chef's Favorites",
        description: favConfig.description || 'Our most celebrated house specialties.',
        image: favConfig.image || 'images/favorites.jpg',
        items: allFavoriteItems,
        isFavoritesSection: true,
        currency
      });
    }

    // B. Main Category Sections
    if (Array.isArray(categories)) {
      categories.forEach((cat, index) => {
        const sectionId = `category-${cat.id || index}`;
        const isFirstActive = !hasFavorites && index === 0;

        tabsHtml += `
          <button type="button" class="nav-tab-btn ${isFirstActive ? 'active' : ''}" data-target="${sectionId}">
            ${escapeHtml(cat.name)}
          </button>
        `;

        sectionsHtml += createCategorySectionHtml({
          id: sectionId,
          name: cat.name,
          description: cat.description || '',
          image: cat.image,
          items: cat.items || [],
          isFavoritesSection: false,
          currency
        });
      });
    }

    // Inject into DOM
    categoryTabsEl.innerHTML = tabsHtml;
    menuContainerEl.innerHTML = sectionsHtml;

    // Attach Event Handlers
    attachTabClickHandlers();
    attachImageErrorFallbacks();
    setupScrollSpy();
  }

  // =========================================================================
  // 4. HTML Generator for a Category Section
  // =========================================================================
  function createCategorySectionHtml({ id, name, description, image, items, isFavoritesSection, currency }) {
    const itemCountText = `${items.length} ${items.length === 1 ? 'Dish' : 'Dishes'}`;

    // Category items HTML (Strictly text-based, no food images for sub-items)
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

        <!-- Category Title & Description -->
        <div class="category-info">
          <div class="category-header-top">
            <h2 class="category-title">
              ${isFavoritesSection ? '<span class="category-badge-star">★</span>' : ''}
              ${escapeHtml(name)}
            </h2>
            <span class="category-item-count">${itemCountText}</span>
          </div>
          ${description ? `<p class="category-description">${escapeHtml(description)}</p>` : ''}
        </div>

        <!-- Text-Based Food Items List -->
        <div class="items-list">
          ${itemsHtml}
        </div>
      </section>
    `;
  }

  // =========================================================================
  // 5. HTML Generator for Individual Text-Based Food Items (Mobile-Optimized)
  // =========================================================================
  function createFoodItemHtml(item, currency, isFavoritesSection) {
    const isAvailable = item.available !== false;
    
    // Format price with Pakistani Rupee (e.g., Rs. 1,450)
    const formattedPrice = typeof item.price === 'number' 
      ? `${currency}${item.price.toLocaleString()}` 
      : `${currency}${item.price || ''}`;
    
    // Tag badges
    let tagsHtml = '';
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      tagsHtml = `
        <div class="food-item-tags">
          ${item.tags.map(tag => {
            const lower = tag.toLowerCase();
            let extraClass = '';
            if (lower.includes('veg')) extraClass = 'tag-veg';
            if (lower.includes('spicy') || lower.includes('hot')) extraClass = 'tag-spicy';
            return `<span class="tag-pill ${extraClass}">${escapeHtml(tag)}</span>`;
          }).join('')}
        </div>
      `;
    }

    return `
      <article 
        class="food-item ${!isAvailable ? 'is-sold-out' : ''}" 
        data-item-name="${escapeHtml(item.name || '').toLowerCase()}"
        data-item-desc="${escapeHtml(item.description || '').toLowerCase()}"
        data-item-tags="${escapeHtml((item.tags || []).join(' ')).toLowerCase()}"
      >
        <div class="food-item-header">
          <div class="food-item-title-col">
            <h3 class="food-item-name">${escapeHtml(item.name)}</h3>
            <div class="food-item-status-badges">
              ${item.isFavorite && !isFavoritesSection ? '<span class="favorite-pill">★ Fav</span>' : ''}
              ${!isAvailable ? '<span class="sold-out-badge">Sold Out</span>' : ''}
            </div>
          </div>
          <div class="food-item-price-col">
            <span class="food-item-price">${formattedPrice}</span>
          </div>
        </div>
        ${item.description ? `<p class="food-item-desc">${escapeHtml(item.description)}</p>` : ''}
        ${tagsHtml}
      </article>
    `;
  }

  // =========================================================================
  // 6. Graceful Image Fallback (No Broken Icons)
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
      // Handle already cached error
      if (img.complete && img.naturalWidth === 0) {
        img.dispatchEvent(new Event('error'));
      }
    });
  }

  // =========================================================================
  // 7. Sticky Category Bar Navigation & Touch Smooth Scroll
  // =========================================================================
  function attachTabClickHandlers() {
    const tabs = categoryTabsEl.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        const targetId = tab.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
          // If search is active, clear search so user can jump smoothly
          if (searchInput.value.trim().length > 0) {
            clearSearch();
          }

          // Smooth scroll to section
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Update active tab state
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          scrollTabIntoView(tab);
        }
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
  // 8. ScrollSpy (Active Category Tracking on Scroll)
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
    if (window.scrollY > 150) {
      stickyNav.classList.add('is-stuck');
    } else {
      stickyNav.classList.remove('is-stuck');
    }
  }

  function handleBackToTopVisibility() {
    if (!backToTopBtn) return;
    if (window.scrollY > 350) {
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
    // If searching, keep scrollspy passive
    if (searchInput && searchInput.value.trim().length > 0) return;

    const sections = menuContainerEl.querySelectorAll('.category-section');
    const scrollPos = window.scrollY + 100; // Offset for sticky nav

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
  // 9. Instant Real-Time Search Filter
  // =========================================================================
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      handleSearch(query);
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      clearSearch();
    });
  }

  function clearSearch() {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    searchResultsInfo.classList.add('hidden');
    handleSearch('');
    searchInput.focus();
  }

  function handleSearch(query) {
    if (!menuContainerEl) return;

    const sections = menuContainerEl.querySelectorAll('.category-section');
    let totalMatchingDishes = 0;

    if (!query) {
      searchClearBtn.classList.add('hidden');
      searchResultsInfo.classList.add('hidden');
      sections.forEach(sec => {
        sec.classList.remove('hidden');
        const items = sec.querySelectorAll('.food-item');
        items.forEach(item => item.classList.remove('hidden'));
      });
      removeNoResultsCard();
      return;
    }

    searchClearBtn.classList.remove('hidden');

    sections.forEach(section => {
      const items = section.querySelectorAll('.food-item');
      let matchingCountInSec = 0;

      items.forEach(item => {
        const name = item.getAttribute('data-item-name') || '';
        const desc = item.getAttribute('data-item-desc') || '';
        const tags = item.getAttribute('data-item-tags') || '';
        const categoryName = (section.getAttribute('data-category-name') || '').toLowerCase();

        const isMatch = name.includes(query) || desc.includes(query) || tags.includes(query) || categoryName.includes(query);

        if (isMatch) {
          item.classList.remove('hidden');
          matchingCountInSec++;
          totalMatchingDishes++;
        } else {
          item.classList.add('hidden');
        }
      });

      // If category has zero matching dishes, hide category card
      if (matchingCountInSec === 0) {
        section.classList.add('hidden');
      } else {
        section.classList.remove('hidden');
      }
    });

    // Update search feedback banner
    searchResultsInfo.classList.remove('hidden');
    if (totalMatchingDishes > 0) {
      searchResultsInfo.textContent = `Showing ${totalMatchingDishes} matching ${totalMatchingDishes === 1 ? 'dish' : 'dishes'}`;
      removeNoResultsCard();
    } else {
      searchResultsInfo.textContent = `No dishes found for "${query}"`;
      renderNoResultsCard(query);
    }
  }

  function renderNoResultsCard(query) {
    removeNoResultsCard();
    const card = document.createElement('div');
    card.id = 'search-no-results';
    card.className = 'no-results-card';
    card.innerHTML = `
      <h3>No Dishes Found</h3>
      <p>We couldn't find anything matching <strong>"${escapeHtml(query)}"</strong>.</p>
      <button type="button" class="btn-reset-search" id="btn-clear-search-result">View All Dishes</button>
    `;
    menuContainerEl.appendChild(card);
    const clearBtn = document.getElementById('btn-clear-search-result');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearSearch);
    }
  }

  function removeNoResultsCard() {
    const existing = document.getElementById('search-no-results');
    if (existing) existing.remove();
  }

  // =========================================================================
  // 10. Sanitization Helper
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
