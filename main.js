// ---------- SUPABASE SETUP ----------
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // from Supabase settings → API

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const path = document.location.pathname;
const isCustomerPage =
  path.endsWith('index.html') || path === '/' || path === '';
const isAdminPage = path.endsWith('admin.html');

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
      .eq('is_available', true);

    if (error) {
      productListEl.textContent = 'Error loading products.';
      console.error(error);
      return;
    }

    products = data;
    renderProducts();
  }

  function renderProducts() {
    productListEl.innerHTML = '';
    products.forEach(p => {
      const div = document.createElement('div');
      div.textContent = `${p.name} - ${formatPrice(p.price)} AED`;
      const btn = document.createElement('button');
      btn.textContent = 'Add';
      btn.onclick = () => addToCart(p.id);
      div.appendChild(btn);
      productListEl.appendChild(div);
    });
  }

  function addToCart(productId) {
    if (!cart[productId]) cart[productId] = 0;
    cart[productId]++;
    renderCart();
  }

  function renderCart() {
    cartEl.innerHTML = '';
    let total = 0;

    Object.entries(cart).forEach(([pid, qty]) => {
      const product = products.find(p => p.id == pid);
      if (!product) return;
      const lineTotal = product.price * qty;
      total += lineTotal;

      const div = document.createElement('div');
      div.textContent = `${product.name} x ${qty} = ${formatPrice(lineTotal)} AED`;
      cartEl.appendChild(div);
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
      if (product) total += product.price * qty;
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
      data.forEach(p => {
        const div = document.createElement('div');
        div.textContent =
          `#${p.id} ${p.name} - ${formatPrice(p.price)} AED - ` +
          (p.is_available ? 'Available' : 'Hidden');
        adminProductListEl.appendChild(div);
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
      data.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.style.border = '1px solid #ccc';
        orderDiv.style.margin = '8px 0';
        orderDiv.style.padding = '4px';

        const header = document.createElement('div');
        header.textContent =
          `Order #${order.id} - ` +
          `${new Date(order.created_at).toLocaleTimeString()} - ` +
          `Total: ${formatPrice(order.total_price)} AED`;
        orderDiv.appendChild(header);

        const itemsUl = document.createElement('ul');
        (order.order_items || []).forEach(oi => {
          const li = document.createElement('li');
          li.textContent = `${oi.products.name} x ${oi.quantity}`;
          itemsUl.appendChild(li);
        });

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

    loadProductsAdmin();
    loadOrders();
  }
}
