// ---------- SUPABASE SETUP ----------
const SUPABASE_URL = 'https://fjhgnspepthkintjsyyg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__2Yj9y_7TmmaYfRkAOJGCg_8AT55CZ3'; // from Supabase settings → API

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// GitHub Pages: treat anything that's not admin.html as the customer page
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

  let products = [];
  let cart = {}; // { productId: quantity }

  async function loadProducts() {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      productListEl.textContent = 'Error loading products.';
      console.error(error);
      return;
    }

    products = data;
    renderProducts();
  }

  function renderProducts() {
    const emojiFallback = '🍰';

    productListEl.innerHTML = '';

    if (!products || products.length === 0) {
      const empty = document.createElement('div');
      empty.style.gridColumn = '1 / -1';
      empty.style.textAlign = 'center';
      empty.style.color = '#8a6a5c';
      empty.textContent = 'No products yet. Add some items in the admin panel.';
      productListEl.appendChild(empty);
      return;
    }

    products.forEach(p => {
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

      const priceEl = document.createElement('div');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = `${formatPrice(lineTotal)} AED`;

      row.appendChild(left);
      row.appendChild(priceEl);

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

    alert(`Order placed! Order ID: ${orderId}`);
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
        extraEl.textContent = `#${p.id} · ${p.is_available ? 'Visible' : 'Hidden'}`;

        meta.appendChild(nameEl);
        meta.appendChild(extraEl);

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
          const confirmDelete = confirm(`Remove "${p.name}" from the menu?`);
          if (!confirmDelete) return;

          const { error: deleteError } = await client
            .from('products')
            .delete()
            .eq('id', p.id);

          if (deleteError) {
            alert('Error removing product.');
            console.error(deleteError);
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
      if (!name || isNaN(priceAed)) {
        alert('Enter name and price.');
        return;
      }

      const priceFils = Math.round(priceAed * 100);

      const { error } = await client
        .from('products')
        .insert({ name, price: priceFils, is_available: true });

      if (error) {
        alert('Error adding product.');
        console.error(error);
        return;
      }

      nameInput.value = '';
      priceInput.value = '';
      await loadProductsAdmin();
    }

addProductBtn.addEventListener('click', addProduct);
refreshOrdersBtn.addEventListener('click', loadOrders);

loadProductsAdmin();
loadOrders();
  }
}
