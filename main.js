// ---------- SUPABASE SETUP ----------
const SUPABASE_URL = 'https://fjhgnspepthkintjsyyg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__2Yj9y_7TmmaYfRkAOJGCg_8AT55CZ3';

const PRODUCT_IMAGE_BUCKET = 'product-images';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const path = document.location.pathname;
const isAdminPage = path.endsWith('admin.html');
const isCustomerPage = !isAdminPage;

function formatPrice(fils) {
  return (fils / 100).toFixed(2);
}

// ---------- CUSTOMER / POS PAGE ----------
if (isCustomerPage) {
  const productListEl = document.getElementById('product-list');
  const cartEl = document.getElementById('cart');
  const subtotalEl = document.getElementById('subtotal');
  const totalAfterDiscountEl = document.getElementById('total-after-discount');
  const placeOrderBtn = document.getElementById('place-order-btn');
  const categoryPillsEl = document.getElementById('category-pills');

  const orderModalOverlay = document.getElementById('order-modal-overlay');
  const orderModalNumber = document.getElementById('order-modal-number');
  const orderModalClose = document.getElementById('order-modal-close');

  const customerNameInput = document.getElementById('customer-name');
  const paymentMethodSelect = document.getElementById('payment-method');
  const cashReceivedInput = document.getElementById('cash-received');
  const changeAmountEl = document.getElementById('change-amount');
  const discountAmountInput = document.getElementById('discount-amount');

  let products = [];
  let cart = [];
  let categories = [];
  let selectedCategories = new Set();

  function showOrderModal(orderId) {
    orderModalNumber.textContent = `#${orderId}`;
    orderModalOverlay.classList.remove('hidden');
  }

  function hideOrderModal() {
    orderModalOverlay.classList.add('hidden');
  }

  if (orderModalClose && orderModalOverlay) {
    orderModalClose.addEventListener('click', hideOrderModal);
    orderModalOverlay.addEventListener('click', e => {
      if (e.target === orderModalOverlay) hideOrderModal();
    });
  }

  async function loadProducts() {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      if (productListEl) {
        productListEl.textContent = 'Error loading products.';
      }
      console.error('Error loading products:', error);
      return;
    }

    products = (data || []).filter(p => p.is_available !== false);

    const catSet = new Set();
    products.forEach(p => {
      if (p.category && p.category.trim() !== '') {
        catSet.add(p.category.trim());
      }
    });
    categories = Array.from(catSet).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    renderCategoryButtons();
    renderProducts();
  }

  function renderCategoryButtons() {
    if (!categoryPillsEl) return;

    categoryPillsEl.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'pill primary';
    allBtn.textContent = 'All';
    allBtn.onclick = () => {
      selectedCategories.clear();
      updateCategoryPillStyles();
      renderProducts();
    };
    categoryPillsEl.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill';
      btn.textContent = cat;

      btn.onclick = () => {
        if (selectedCategories.has(cat)) {
          selectedCategories.delete(cat);
        } else {
          selectedCategories.add(cat);
        }
        updateCategoryPillStyles();
        renderProducts();
      };

      categoryPillsEl.appendChild(btn);
    });

    updateCategoryPillStyles();
  }

  function updateCategoryPillStyles() {
    if (!categoryPillsEl) return;

    const buttons = Array.from(categoryPillsEl.querySelectorAll('.pill'));
    buttons.forEach(btn => {
      const label = btn.textContent;
      if (label === 'All') {
        if (selectedCategories.size === 0) {
          btn.classList.add('primary');
        } else {
          btn.classList.remove('primary');
        }
      } else {
        if (selectedCategories.has(label)) {
          btn.classList.add('primary');
        } else {
          btn.classList.remove('primary');
        }
      }
    });
  }

  function renderProducts() {
    const emojiFallback = '🍰';

    if (!productListEl) return;
    productListEl.innerHTML = '';

    let visibleProducts = products;
    if (selectedCategories.size > 0) {
      visibleProducts = products.filter(p => {
        const cat = (p.category || '').trim();
        return cat && selectedCategories.has(cat);
      });
    }

    if (!visibleProducts || visibleProducts.length === 0) {
      const empty = document.createElement('div');
      empty.style.gridColumn = '1 / -1';
      empty.style.textAlign = 'center';
      empty.style.color = '#8a6a5c';
      empty.textContent =
        selectedCategories.size === 0
          ? 'No products yet. Add some items in the admin panel.'
          : 'No items in these categories.';
      productListEl.appendChild(empty);
      return;
    }

    visibleProducts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';

      const tag = document.createElement('div');
      tag.className = 'product-tag';
      tag.textContent = `#${p.id}`;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'product-image-wrap';

      const img = document.createElement('img');
      img.className = 'product-image';
      if (p.image_url) {
        img.src = p.image_url;
        img.alt = p.name || 'Product image';
      } else {
        img.style.display = 'none';
      }

      const emojiOverlay = document.createElement('div');
      emojiOverlay.className = 'product-emoji-overlay';
      emojiOverlay.textContent = emojiFallback;

      imgWrap.appendChild(img);
      imgWrap.appendChild(emojiOverlay);

      const nameEl = document.createElement('div');
      nameEl.className = 'product-name';
      nameEl.textContent = p.name || 'Untitled item';

      const descEl = document.createElement('div');
      descEl.className = 'product-desc';
      descEl.textContent =
        (p.description && p.description.trim().length > 0)
          ? p.description
          : 'Sweet, chilled and perfect for market day.';

      let toppingCheckboxes = [];
      if (Array.isArray(p.toppings) && p.toppings.length > 0) {
        const toppingsEl = document.createElement('div');
        toppingsEl.className = 'product-toppings';

        p.toppings.forEach((t, idx) => {
          const label = document.createElement('label');
          label.className = 'topping-toggle';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = idx;
          toppingCheckboxes.push(cb);

          const span = document.createElement('span');
          span.textContent = `${t.name} +${formatPrice(t.price || 0)} AED`;

          label.appendChild(cb);
          label.appendChild(span);
          toppingsEl.appendChild(label);
        });

        card.appendChild(toppingsEl);
      }

      const bottom = document.createElement('div');
      bottom.className = 'product-bottom';

      const priceEl = document.createElement('div');
      priceEl.className = 'product-price';
      priceEl.innerHTML = `${formatPrice(p.price || 0)} <span>AED</span>`;

      const btn = document.createElement('button');
      btn.className = 'btn-add';
      btn.type = 'button';
      btn.textContent = 'Add';

      btn.onclick = () => {
        const selectedIndexes = toppingCheckboxes
          .filter(cb => cb.checked)
          .map(cb => parseInt(cb.value, 10));

        addToCart(p.id, selectedIndexes);
        toppingCheckboxes.forEach(cb => (cb.checked = false));
      };

      bottom.appendChild(priceEl);
      bottom.appendChild(btn);

      card.appendChild(tag);
      card.appendChild(imgWrap);
      card.appendChild(nameEl);
      card.appendChild(descEl);
      card.appendChild(bottom);
      productListEl.appendChild(card);
    });
  }

  function addToCart(productId, toppingIndexes = []) {
    const sorted = (toppingIndexes || []).slice().sort((a, b) => a - b);
    const key = JSON.stringify(sorted);
    const existing = cart.find(
      item =>
        item.productId === productId &&
        JSON.stringify(item.toppingIndexes) === key
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        lineId: Date.now() + Math.random(),
        productId,
        toppingIndexes: sorted,
        quantity: 1
      });
    }
    renderCart();
  }

  function computeLinePrices(product, toppingIndexes) {
    const basePrice = product.price || 0;
    let toppingTotal = 0;
    let toppingNames = [];

    if (Array.isArray(product.toppings) && Array.isArray(toppingIndexes)) {
      toppingIndexes.forEach(idx => {
        const t = product.toppings[idx];
        if (!t) return;
        const price = t.price || 0;
        toppingTotal += price;
        toppingNames.push(t.name);
      });
    }

    return {
      unitPrice: basePrice + toppingTotal,
      toppingTotal,
      toppingNames
    };
  }

  function recalcTotals() {
    let subtotalFils = 0;
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      const { unitPrice } = computeLinePrices(product, item.toppingIndexes);
      subtotalFils += unitPrice * item.quantity;
    });

    subtotalEl.textContent = formatPrice(subtotalFils);

    let discountAed = parseFloat(discountAmountInput.value || '0');
    if (isNaN(discountAed) || discountAed < 0) discountAed = 0;
    let discountFils = Math.round(discountAed * 100);

    if (discountFils > subtotalFils) discountFils = subtotalFils;

    const finalTotalFils = subtotalFils - discountFils;
    totalAfterDiscountEl.textContent = formatPrice(finalTotalFils);

    updateChangeDisplay(subtotalFils, finalTotalFils);
  }

  function renderCart() {
    if (!cartEl) return;
    cartEl.innerHTML = '';

    if (cart.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'cart-empty';
      empty.textContent = 'No items yet. Tap an item to add it.';
      cartEl.appendChild(empty);
      subtotalEl.textContent = '0.00';
      totalAfterDiscountEl.textContent = '0.00';
      changeAmountEl.textContent = '0.00';
      return;
    }

    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;

      const { unitPrice, toppingNames } = computeLinePrices(
        product,
        item.toppingIndexes
      );
      const lineTotal = unitPrice * item.quantity;

      const row = document.createElement('div');
      row.className = 'cart-item';

      const left = document.createElement('div');
      left.className = 'cart-item-left';

      const nameEl = document.createElement('div');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = product.name;

      const metaEl = document.createElement('div');
      metaEl.className = 'cart-item-meta';
      metaEl.textContent = `${item.quantity} × ${formatPrice(unitPrice)} AED`;

      left.appendChild(nameEl);
      left.appendChild(metaEl);

      if (toppingNames.length > 0) {
        const toppingEl = document.createElement('div');
        toppingEl.className = 'cart-item-meta';
        toppingEl.textContent = `with ${toppingNames.join(', ')}`;
        left.appendChild(toppingEl);
      }

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '6px';

      const priceEl = document.createElement('div');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = `${formatPrice(lineTotal)} AED`;

      const removeProductBtn = document.createElement('button');
      removeProductBtn.type = 'button';
      removeProductBtn.className = 'cart-remove-btn';
      removeProductBtn.textContent = '−';
      removeProductBtn.onclick = () => {
        item.quantity -= 1;
        if (item.quantity <= 0) {
          cart = cart.filter(x => x.lineId !== item.lineId);
        }
        renderCart();
        recalcTotals();
      };

      const clearLineBtn = document.createElement('button');
      clearLineBtn.type = 'button';
      clearLineBtn.className = 'cart-remove-btn';
      clearLineBtn.textContent = 'x';
      clearLineBtn.onclick = () => {
        cart = cart.filter(x => x.lineId !== item.lineId);
        renderCart();
        recalcTotals();
      };

      right.appendChild(priceEl);
      right.appendChild(removeProductBtn);
      right.appendChild(clearLineBtn);

      row.appendChild(left);
      row.appendChild(right);
      cartEl.appendChild(row);
    });

    recalcTotals();
  }

  function updateChangeDisplay(subtotalFilsOverride = null, finalTotalFilsOverride = null) {
    const subtotalFils = subtotalFilsOverride != null
      ? subtotalFilsOverride
      : Math.round(parseFloat(subtotalEl.textContent || '0') * 100);

    const finalTotalFils = finalTotalFilsOverride != null
      ? finalTotalFilsOverride
      : subtotalFils;

    const paymentMethod = paymentMethodSelect.value;
    if (paymentMethod === 'card') {
      changeAmountEl.textContent = '0.00';
      return;
    }

    const cash = parseFloat(cashReceivedInput.value || '0');
    const cashFils = Math.round(cash * 100);

    let changeFils = cashFils - finalTotalFils;
    if (changeFils < 0) changeFils = 0;

    changeAmountEl.textContent = formatPrice(changeFils);
  }

  if (cashReceivedInput) {
    cashReceivedInput.addEventListener('input', () => recalcTotals());
  }
  if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener('change', () => recalcTotals());
  }
  if (discountAmountInput) {
    discountAmountInput.addEventListener('input', () => recalcTotals());
  }

  async function placeOrder() {
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }

    let subtotalFils = 0;
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      const { unitPrice } = computeLinePrices(product, item.toppingIndexes);
      subtotalFils += unitPrice * item.quantity;
    });

    let discountAed = parseFloat(discountAmountInput.value || '0');
    if (isNaN(discountAed) || discountAed < 0) discountAed = 0;
    let discountFils = Math.round(discountAed * 100);
    if (discountFils > subtotalFils) discountFils = subtotalFils;

    const totalFils = subtotalFils - discountFils;

    const customerName = customerNameInput.value.trim() || null;
    const paymentMethod = paymentMethodSelect.value || 'cash';

    const { data: order, error: orderError } = await client
      .from('orders')
      .insert({
        total_price: totalFils,
        subtotal_price: subtotalFils,
        discount_amount: discountFils,
        customer_name: customerName,
        payment_method: paymentMethod,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      alert('Error placing order.');
      console.error('Order insert error:', orderError);
      return;
    }

    const orderId = order.id;

    const itemsPayload = cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      const { toppingNames, toppingTotal } = computeLinePrices(
        product,
        item.toppingIndexes
      );

      let toppingName = null;
      let toppingPrice = null;

      if (toppingNames.length > 0) {
        toppingName = toppingNames.join(', ');
        toppingPrice = toppingTotal;
      }

      return {
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        topping_name: toppingName,
        topping_price: toppingPrice
      };
    });

    const { error: itemsError } = await client
      .from('order_items')
      .insert(itemsPayload);

    if (itemsError) {
      alert('Error saving order items.');
      console.error('Order items insert error:', itemsError);
      return;
    }

    showOrderModal(orderId);
    cart = [];
    renderCart();
    customerNameInput.value = '';
    cashReceivedInput.value = '';
    discountAmountInput.value = '';
    subtotalEl.textContent = '0.00';
    totalAfterDiscountEl.textContent = '0.00';
    changeAmountEl.textContent = '0.00';
  }

  if (placeOrderBtn) placeOrderBtn.addEventListener('click', placeOrder);
  if (productListEl) loadProducts();
}

// ---------- ADMIN PAGE ----------
if (isAdminPage) {
  const ADMIN_PASSWORD = 'change_me_before_market_day';

  const lockedDiv = document.getElementById('locked');
  const contentDiv = document.getElementById('admin-content');
  const passInput = document.getElementById('admin-pass');
  const unlockBtn = document.getElementById('unlock-btn');

  unlockBtn.addEventListener('click', () => {
    if (passInput.value === ADMIN_PASSWORD) {
      lockedDiv.style.display = 'none';
      contentDiv.style.display = 'block';
      initAdmin();
    } else {
      alert('Wrong password');
    }
  });

  function initAdmin() {
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const categoryInput = document.getElementById('product-category');
    const descriptionInput = document.getElementById('product-description');
    const stockInitialInput = document.getElementById('product-stock-initial');

    const toppingNameInput = document.getElementById('topping-name');
    const toppingPriceInput = document.getElementById('topping-price');
    const addToppingBtn = document.getElementById('add-topping-btn');
    const toppingsListEl = document.getElementById('toppings-list');
    let currentToppings = [];

    const imageFileInput = document.getElementById('image-file');
    const imageCanvas = document.getElementById('image-canvas');
    const clearImageBtn = document.getElementById('clear-image-btn');
    const useCropBtn = document.getElementById('use-crop-btn');
    const croppedPreviewImg = document.getElementById('cropped-preview');

    const addProductBtn = document.getElementById('add-product-btn');
    const adminProductListEl = document.getElementById('admin-product-list');
    const ordersListEl = document.getElementById('orders-list');
    const refreshOrdersBtn = document.getElementById('refresh-orders-btn');
    const ordersStatusFilterEl = document.getElementById('orders-status-filter');

    const bannerNetRevenueEl = document.getElementById('banner-net-revenue');
    const bannerGrossSalesEl = document.getElementById('banner-gross-sales');
    const bannerDiscountEl = document.getElementById('banner-discount');
    const bannerStockRemainingEl = document.getElementById('banner-stock-remaining');
    const bannerPendingCountEl = document.getElementById('banner-pending-count');
    const bannerCompletedCountEl = document.getElementById('banner-completed-count');

    // ----- Toppings UI -----
    function renderToppingsChips() {
      toppingsListEl.innerHTML = '';
      currentToppings.forEach((t, idx) => {
        const chip = document.createElement('div');
        chip.className = 'topping-chip';
        chip.textContent = `${t.name} +${formatPrice(t.price)} AED`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'x';
        removeBtn.onclick = () => {
          currentToppings.splice(idx, 1);
          renderToppingsChips();
        };

        chip.appendChild(removeBtn);
        toppingsListEl.appendChild(chip);
      });
    }

    addToppingBtn.addEventListener('click', () => {
      const tName = toppingNameInput.value.trim();
      const tPriceAed = parseFloat(toppingPriceInput.value);

      if (!tName || isNaN(tPriceAed)) {
        alert('Enter topping name and price.');
        return;
      }

      const tPriceFils = Math.round(tPriceAed * 100);
      currentToppings.push({ name: tName, price: tPriceFils });

      toppingNameInput.value = '';
      toppingPriceInput.value = '';
      renderToppingsChips();
    });

    // ----- Image cropper -----
    const ctx = imageCanvas.getContext('2d');
    let originalImage = null;
    let imageLoaded = false;
    let cropStartX = null;
    let cropStartY = null;
    let cropEndX = null;
    let cropEndY = null;
    let isDragging = false;
    let croppedBlob = null;

    function resetImageCropper() {
      ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
      originalImage = null;
      imageLoaded = false;
      cropStartX = cropStartY = cropEndX = cropEndY = null;
      isDragging = false;
      croppedBlob = null;
      croppedPreviewImg.style.display = 'none';
      croppedPreviewImg.src = '';
    }

    imageFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) {
        resetImageCropper();
        return;
      }

      const reader = new FileReader();
      reader.onload = ev => {
        originalImage = new Image();
        originalImage.onload = () => {
          imageCanvas.width = originalImage.width;
          imageCanvas.height = originalImage.height;
          ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);
          imageLoaded = true;
        };
        originalImage.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    function redrawCanvasWithCropRect() {
      if (!originalImage) return;
      ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
      ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);

      if (
        cropStartX !== null && cropStartY !== null &&
        cropEndX !== null && cropEndY !== null
      ) {
        const x = Math.min(cropStartX, cropEndX);
        const y = Math.min(cropStartY, cropEndY);
        const w = Math.abs(cropEndX - cropStartX);
        const h = Math.abs(cropEndY - cropStartY);

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
    }

    imageCanvas.addEventListener('mousedown', e => {
      if (!imageLoaded) return;
      const rect = imageCanvas.getBoundingClientRect();
      const scaleX = imageCanvas.width / rect.width;
      const scaleY = imageCanvas.height / rect.height;

      cropStartX = (e.clientX - rect.left) * scaleX;
      cropStartY = (e.clientY - rect.top) * scaleY;
      cropEndX = cropStartX;
      cropEndY = cropStartY;
      isDragging = true;
      redrawCanvasWithCropRect();
    });

    imageCanvas.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const rect = imageCanvas.getBoundingClientRect();
      const scaleX = imageCanvas.width / rect.width;
      const scaleY = imageCanvas.height / rect.height;

      cropEndX = (e.clientX - rect.left) * scaleX;
      cropEndY = (e.clientY - rect.top) * scaleY;
      redrawCanvasWithCropRect();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    clearImageBtn.addEventListener('click', () => {
      imageFileInput.value = '';
      resetImageCropper();
    });

    useCropBtn.addEventListener('click', () => {
      if (!imageLoaded || cropStartX === null || cropEndX === null || cropStartY === null || cropEndY === null) {
        alert('Select a crop area on the image first.');
        return;
      }

      const x = Math.min(cropStartX, cropEndX);
      const y = Math.min(cropStartY, cropEndY);
      const w = Math.abs(cropEndX - cropStartX);
      const h = Math.abs(cropEndY - cropStartY);

      if (w < 10 || h < 10) {
        alert('Crop area is too small.');
        return;
      }

      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');

      const maxSize = 512;
      const scale = Math.min(maxSize / w, maxSize / h, 1);
      const outW = Math.round(w * scale);
      const outH = Math.round(h * scale);

      croppedCanvas.width = outW;
      croppedCanvas.height = outH;

      croppedCtx.drawImage(
        imageCanvas,
        x,
        y,
        w,
        h,
        0,
        0,
        outW,
        outH
      );

      croppedCanvas.toBlob(blob => {
        if (!blob) {
          alert('Error creating cropped image.');
          return;
        }
        croppedBlob = blob;
        const previewUrl = URL.createObjectURL(blob);
        croppedPreviewImg.src = previewUrl;
        croppedPreviewImg.style.display = 'block';
      }, 'image/png');
    });

    async function uploadCroppedImageIfAny() {
      if (!croppedBlob) return null;

      const fileName = `product-${Date.now()}.png`;

      const { data, error } = await client.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(fileName, croppedBlob, {
          contentType: 'image/png'
        });

      if (error) {
        console.error('Error uploading image to storage:', error);
        alert('Error uploading image.');
        return null;
      }

      const { data: urlData } = client.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    }

    async function loadProductsAdmin() {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        adminProductListEl.textContent = 'Error loading products.';
        console.error('Admin load products error:', error);
        return;
      }

      adminProductListEl.innerHTML = '';

      if (!data || data.length === 0) {
        adminProductListEl.textContent = 'No products yet. Add your first item above.';
        bannerStockRemainingEl.textContent = '0';
        return;
      }

      let totalStock = 0;

      data.forEach(p => {
        const row = document.createElement('div');
        row.className = 'product-row';

        const meta = document.createElement('div');
        meta.className = 'product-meta';

        const nameEl = document.createElement('div');
        nameEl.className = 'product-name';
        nameEl.textContent = p.name;

        const extraEl = document.createElement('div');
        extraEl.className = 'product-extra';
        const catText = p.category ? ` · ${p.category}` : '';
        extraEl.textContent = `#${p.id}${catText}`;

        const stockEl = document.createElement('div');
        stockEl.className = 'product-stock';
        const currentStock = p.current_stock ?? 0;
        const initialStock = p.initial_stock ?? 0;
        totalStock += currentStock;

        if (currentStock <= 5) {
          stockEl.classList.add('low');
        }

        if (initialStock > 0) {
          stockEl.textContent = `${currentStock} left (out of ${initialStock})`;
        } else {
          stockEl.textContent = `${currentStock} in stock`;
        }

        meta.appendChild(nameEl);
        meta.appendChild(extraEl);
        meta.appendChild(stockEl);

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '6px';

        const priceEl = document.createElement('div');
        priceEl.className = 'product-price';
        priceEl.textContent = `${formatPrice(p.price || 0)} AED`;

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = 'Remove';
        delBtn.className = 'btn btn-outline';
        delBtn.style.fontSize = '11px';

        delBtn.onclick = async () => {
          const ok = confirm(
            `Completely delete "${p.name}" and all of its order items?`
          );
          if (!ok) return;

          const { error: itemsError } = await client
            .from('order_items')
            .delete()
            .eq('product_id', p.id);

          if (itemsError) {
            alert('Error deleting order items for this product. See console.');
            console.error('Delete order_items error:', itemsError);
            return;
          }

          const { error: deleteError } = await client
            .from('products')
            .delete()
            .eq('id', p.id);

          if (deleteError) {
            alert('Error deleting product. See console.');
            console.error('Delete product error:', deleteError);
            return;
          }

          await loadProductsAdmin();
        };

        right.appendChild(priceEl);
        right.appendChild(delBtn);

        row.appendChild(meta);
        row.appendChild(right);

        adminProductListEl.appendChild(row);
      });

      bannerStockRemainingEl.textContent = String(totalStock);
    }

    async function loadOrders() {
      const filterStatus = ordersStatusFilterEl.value;

      let query = client
        .from('orders')
        .select(`
          id,
          created_at,
          total_price,
          subtotal_price,
          discount_amount,
          customer_name,
          payment_method,
          status,
          order_items (
            quantity,
            topping_name,
            topping_price,
            products ( name )
          )
        `)
        .order('id', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        ordersListEl.textContent = 'Error loading orders.';
        console.error('Admin load orders error:', error);
        return;
      }

      ordersListEl.innerHTML = '';

      if (!data || data.length === 0) {
        ordersListEl.textContent = 'No orders yet for this filter.';
        // update banners anyway from all orders
        const { data: allOrders } = await client
          .from('orders')
          .select('total_price, subtotal_price, discount_amount, status');
        if (allOrders) {
          let gross = 0;
          let totalDiscount = 0;
          let net = 0;
          let pendingCount = 0;
          let completedCount = 0;

          allOrders.forEach(order => {
            const subtotal = order.subtotal_price ?? order.total_price ?? 0;
            const discount = order.discount_amount ?? 0;
            const total = order.total_price ?? 0;

            gross += subtotal;
            totalDiscount += discount;
            net += total;

            if (order.status === 'pending') pendingCount += 1;
            if (order.status === 'completed') completedCount += 1;
          });

          bannerNetRevenueEl.textContent = `${formatPrice(net)} AED`;
          bannerGrossSalesEl.textContent = `${formatPrice(gross)} AED`;
          bannerDiscountEl.textContent = `${formatPrice(totalDiscount)} AED`;
          bannerPendingCountEl.textContent = String(pendingCount);
          bannerCompletedCountEl.textContent = String(completedCount);
        }
        return;
      }

      // Compute banners across ALL orders (not just filtered)
      const { data: allOrders, error: allOrdersError } = await client
        .from('orders')
        .select('total_price, subtotal_price, discount_amount, status');

      if (!allOrdersError && allOrders) {
        let gross = 0;
        let totalDiscount = 0;
        let net = 0;
        let pendingCount = 0;
        let completedCount = 0;

        allOrders.forEach(order => {
          const subtotal = order.subtotal_price ?? order.total_price ?? 0;
          const discount = order.discount_amount ?? 0;
          const total = order.total_price ?? 0;

          gross += subtotal;
          totalDiscount += discount;
          net += total;

          if (order.status === 'pending') pendingCount += 1;
          if (order.status === 'completed') completedCount += 1;
        });

        bannerNetRevenueEl.textContent = `${formatPrice(net)} AED`;
        bannerGrossSalesEl.textContent = `${formatPrice(gross)} AED`;
        bannerDiscountEl.textContent = `${formatPrice(totalDiscount)} AED`;
        bannerPendingCountEl.textContent = String(pendingCount);
        bannerCompletedCountEl.textContent = String(completedCount);
      }

      data.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';

        const header = document.createElement('div');
        header.className = 'order-header';

        const idEl = document.createElement('div');
        idEl.className = 'order-id';
        idEl.textContent = `Order #${order.id}`;

        const metaEl = document.createElement('div');
        metaEl.className = 'order-meta';

        const timeStr = new Date(order.created_at).toLocaleTimeString();
        const nameStr = order.customer_name
          ? ` · ${order.customer_name}`
          : '';
        const payStr = order.payment_method
          ? ` · ${order.payment_method.toUpperCase()}`
          : '';
        const discStr =
          order.discount_amount && order.discount_amount > 0
            ? ` · -${formatPrice(order.discount_amount)} AED`
            : '';
        metaEl.textContent = `${timeStr}${nameStr}${payStr}${discStr}`;

        const totalEl = document.createElement('div');
        totalEl.className = 'order-total';
        totalEl.textContent = `${formatPrice(order.total_price || 0)} AED`;

        header.appendChild(idEl);
        header.appendChild(metaEl);
        header.appendChild(totalEl);

        const itemsUl = document.createElement('ul');
        itemsUl.className = 'order-items';
        (order.order_items || []).forEach(oi => {
          const baseName = oi.products?.name || 'Item';
          const toppingSuffix = oi.topping_name
            ? ` (with ${oi.topping_name})`
            : '';
          const li = document.createElement('li');
          li.textContent = `${baseName}${toppingSuffix} × ${oi.quantity}`;
          itemsUl.appendChild(li);
        });

        const footerRow = document.createElement('div');
        footerRow.className = 'order-footer-row';

        const statusPill = document.createElement('span');
        statusPill.className = 'status-pill';
        const s = order.status || 'pending';
        statusPill.textContent = s.toUpperCase();
        if (s === 'pending') statusPill.classList.add('pending');
        if (s === 'completed') statusPill.classList.add('completed');
        if (s === 'cancelled') statusPill.classList.add('cancelled');

        const servedRow = document.createElement('label');
        servedRow.className = 'served-checkbox-row';

        const servedCheckbox = document.createElement('input');
        servedCheckbox.type = 'checkbox';
        servedCheckbox.checked = (s === 'completed');

        const servedText = document.createElement('span');
        servedText.textContent = 'Served';

        servedRow.appendChild(servedCheckbox);
        servedRow.appendChild(servedText);

        servedCheckbox.addEventListener('change', async () => {
          const newStatus = servedCheckbox.checked ? 'completed' : 'pending';

          const { error } = await client
            .from('orders')
            .update({ status: newStatus })
            .eq('id', order.id);

          if (error) {
            alert('Error updating status, see console.');
            console.error('Update order status error:', error);
            servedCheckbox.checked = !servedCheckbox.checked; // revert
            return;
          }

          statusPill.textContent = newStatus.toUpperCase();
          statusPill.className = 'status-pill';
          if (newStatus === 'pending') statusPill.classList.add('pending');
          if (newStatus === 'completed') statusPill.classList.add('completed');
          if (newStatus === 'cancelled') statusPill.classList.add('cancelled');

          await loadOrders(); // refresh banners and filter view
        });

        footerRow.appendChild(statusPill);
        footerRow.appendChild(servedRow);

        orderDiv.appendChild(header);
        orderDiv.appendChild(itemsUl);
        orderDiv.appendChild(footerRow);
        ordersListEl.appendChild(orderDiv);
      });
    }

    async function addProduct() {
      const name = nameInput.value.trim();
      const priceAed = parseFloat(priceInput.value);
      const category = categoryInput.value.trim();
      const description = descriptionInput.value.trim();
      const initialStockVal = parseInt(stockInitialInput.value || '0', 10);

      if (!name || isNaN(priceAed)) {
        alert('Enter name and price.');
        return;
      }

      let imageUrl = null;
      if (croppedBlob) {
        imageUrl = await uploadCroppedImageIfAny();
        if (!imageUrl) {
          return;
        }
      }

      const priceFils = Math.round(priceAed * 100);
      const initialStock = isNaN(initialStockVal) || initialStockVal < 0 ? 0 : initialStockVal;

      const { error } = await client
        .from('products')
        .insert({
          name,
          price: priceFils,
          is_available: true,
          category: category || null,
          description: description || null,
          image_url: imageUrl || null,
          toppings: currentToppings.length > 0 ? currentToppings : null,
          initial_stock: initialStock,
          current_stock: initialStock
        });

      if (error) {
        alert('Error adding product.');
        console.error('Add product error:', error);
        return;
      }

      nameInput.value = '';
      priceInput.value = '';
      categoryInput.value = '';
      descriptionInput.value = '';
      stockInitialInput.value = '';
      imageFileInput.value = '';
      resetImageCropper();
      currentToppings = [];
      renderToppingsChips();

      await loadProductsAdmin();
    }

    addProductBtn.addEventListener('click', addProduct);
    refreshOrdersBtn.addEventListener('click', loadOrders);
    ordersStatusFilterEl.addEventListener('change', loadOrders);

    loadProductsAdmin();
    loadOrders();
  }
}
