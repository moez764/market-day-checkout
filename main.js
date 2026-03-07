// ---------- SUPABASE SETUP ----------
const SUPABASE_URL = 'https://fjhgnspepthkintjsyyg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__2Yj9y_7TmmaYfRkAOJGCg_8AT55CZ3'; // from Supabase settings → API

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// route: anything not admin.html = customer page
const path = document.location.pathname;
const isAdminPage = path.endsWith('admin.html');
const isCustomerPage = !isAdminPage;

function formatPrice(fils) {
  return (fils / 100).toFixed(2);
}

// ---------- CUSTOMER PAGE ----------
if (isCustomerPage) {
  const productListEl = document.getElementById('product-list');
  const cartEl = document.getElementById('cart');
  const totalEl = document.getElementById('total');
  const placeOrderBtn = document.getElementById('place-order-btn');
  const categoryPillsEl = document.getElementById('category-pills');

  const orderModalOverlay = document.getElementById('order-modal-overlay');
  const orderModalNumber = document.getElementById('order-modal-number');
  const orderModalClose = document.getElementById('order-modal-close');

  let products = [];
  let cart = {}; // { productId: quantity }
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
      .eq('is_available', true)
      .order('id', { ascending: true });

    if (error) {
      productListEl.textContent = 'Error loading products.';
      console.error(error);
      return;
    }

    products = data || [];

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
        p.description || 'Sweet, chilled and perfect for market day.';

      const bottom = document.createElement('div');
      bottom.className = 'product-bottom';

      const priceEl = document.createElement('div');
      priceEl.className = 'product-price';
      priceEl.innerHTML = `${formatPrice(p.price || 0)} <span>AED</span>`;

      const btn = document.createElement('button');
      btn.className = 'btn-add';
      btn.type = 'button';
      btn.textContent = 'Add';
      btn.onclick = () => addToCart(p.id);

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

  function addToCart(productId) {
    if (!cart[productId]) cart[productId] = 0;
    cart[productId]++;
    renderCart();
  }

  function renderCart() {
    cartEl.innerHTML = '';

    if (Object.keys(cart).length === 0) {
      const empty = document.createElement('div');
      empty.className = 'cart-empty';
      empty.textContent = 'No items yet. Tap an item to add it.';
      cartEl.appendChild(empty);
      totalEl.textContent = '0.00';
      return;
    }

    let total = 0;

    Object.entries(cart).forEach(([pid, qty]) => {
      const product = products.find(p => p.id == pid);
      if (!product) return;
      const lineTotal = (product.price || 0) * qty;
      total += lineTotal;

      const row = document.createElement('div');
      row.className = 'cart-item';

      const left = document.createElement('div');
      left.className = 'cart-item-left';

      const nameEl = document.createElement('div');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = product.name;

      const metaEl = document.createElement('div');
      metaEl.className = 'cart-item-meta';
      metaEl.textContent = `${qty} × ${formatPrice(product.price || 0)} AED`;

      left.appendChild(nameEl);
      left.appendChild(metaEl);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '8px';

      const priceEl = document.createElement('div');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = `${formatPrice(lineTotal)} AED`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'cart-remove-btn';
      removeBtn.textContent = '−';
      removeBtn.onclick = () => {
        if (!cart[pid]) return;
        cart[pid]--;
        if (cart[pid] <= 0) {
          delete cart[pid];
        }
        renderCart();
      };

      right.appendChild(priceEl);
      right.appendChild(removeBtn);

      row.appendChild(left);
      row.appendChild(right);

      cartEl.appendChild(row);
    });

    totalEl.textContent = formatPrice(total);
  }

  async function placeOrder() {
    if (Object.keys(cart).length === 0) {
      alert('Cart is empty.');
      return;
    }

    let total = 0;
    Object.entries(cart).forEach(([pid, qty]) => {
      const product = products.find(p => p.id == pid);
      if (product) total += (product.price || 0) * qty;
    });

    const { data: order, error: orderError } = await client
      .from('orders')
      .insert({ total_price: total })
      .select()
      .single();

    if (orderError) {
      alert('Error placing order.');
      console.error(orderError);
      return;
    }

    const orderId = order.id;

    const items = Object.entries(cart).map(([pid, qty]) => ({
      order_id: orderId,
      product_id: Number(pid),
      quantity: qty
    }));

    const { error: itemsError } = await client
      .from('order_items')
      .insert(items);

    if (itemsError) {
      alert('Error saving order items.');
      console.error(itemsError);
      return;
    }

    showOrderModal(orderId);
    cart = {};
    renderCart();
  }

  placeOrderBtn.addEventListener('click', placeOrder);
  loadProducts();
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
    const addProductBtn = document.getElementById('add-product-btn');
    const adminProductListEl = document.getElementById('admin-product-list');
    const ordersListEl = document.getElementById('orders-list');
    const refreshOrdersBtn = document.getElementById('refresh-orders-btn');

    async function loadProductsAdmin() {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        adminProductListEl.textContent = 'Error loading products.';
        console.error(error);
        return;
      }

      adminProductListEl.innerHTML = '';

      if (!data || data.length === 0) {
        adminProductListEl.textContent = 'No products yet. Add your first item above.';
        return;
      }

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
        const visibleText = p.is_available ? '' : ' · hidden';
        extraEl.textContent = `#${p.id}${catText}${visibleText}`;

        meta.appendChild(nameEl);
        meta.appendChild(extraEl);

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '6px';

        const priceEl = document.createElement('div');
        priceEl.className = 'product-price';
        priceEl.textContent = `${formatPrice(p.price || 0)} AED`;

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.textContent = p.is_available ? 'Hide from kiosk' : 'Show on kiosk';
        toggleBtn.className = 'btn btn-outline';
        toggleBtn.style.fontSize = '11px';

        toggleBtn.onclick = async () => {
          const makeAvailable = !p.is_available;
          const confirmMsg = makeAvailable
            ? `Show "${p.name}" on the kiosk again?`
            : `Hide "${p.name}" from the kiosk? (Existing orders stay in history.)`;
          const ok = confirm(confirmMsg);
          if (!ok) return;

          const { error: updateError } = await client
            .from('products')
            .update({ is_available: makeAvailable })
            .eq('id', p.id);

          if (updateError) {
            alert('Error updating product visibility.');
            console.error(updateError);
            return;
          }

          await loadProductsAdmin();
        };

        right.appendChild(priceEl);
        right.appendChild(toggleBtn);

        row.appendChild(meta);
        row.appendChild(right);

        adminProductListEl.appendChild(row);
      });
    }

    async function loadOrders() {
      const { data, error } = await client
        .from('orders')
        .select('id, created_at, total_price, order_items ( quantity, products ( name ))')
        .order('id', { ascending: false });

      if (error) {
        ordersListEl.textContent = 'Error loading orders.';
        console.error(error);
        return;
      }

      ordersListEl.innerHTML = '';

      if (!data || data.length === 0) {
        ordersListEl.textContent = 'No orders yet.';
        return;
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
        metaEl.textContent = new Date(order.created_at).toLocaleTimeString();

        const totalEl = document.createElement('div');
        totalEl.className = 'order-total';
        totalEl.textContent = `${formatPrice(order.total_price || 0)} AED`;

        header.appendChild(idEl);
        header.appendChild(metaEl);
        header.appendChild(totalEl);

        const itemsUl = document.createElement('ul');
        itemsUl.className = 'order-items';
        (order.order_items || []).forEach(oi => {
          const li = document.createElement('li');
          li.textContent = `${oi.products.name} × ${oi.quantity}`;
          itemsUl.appendChild(li);
        });

        orderDiv.appendChild(header);
        orderDiv.appendChild(itemsUl);
        ordersListEl.appendChild(orderDiv);
      });
    }

    async function addProduct() {
      const name = nameInput.value.trim();
      const priceAed = parseFloat(priceInput.value);
      const category = categoryInput.value.trim();

      if (!name || isNaN(priceAed)) {
        alert('Enter name and price.');
        return;
      }

      const priceFils = Math.round(priceAed * 100);

      const { error } = await client
        .from('products')
        .insert({
          name,
          price: priceFils,
          is_available: true,
          category: category || null
        });

      if (error) {
        alert('Error adding product.');
        console.error(error);
        return;
      }

      nameInput.value = '';
      priceInput.value = '';
      categoryInput.value = '';
      await loadProductsAdmin();
    }

    addProductBtn.addEventListener('click', addProduct);
    refreshOrdersBtn.addEventListener('click', loadOrders);

    loadProductsAdmin();
    loadOrders();
  }
}
