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
  let cart = {};
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

    console.log('Products from Supabase:', data, 'Error:', error);

    if (error) {
      productListEl.textContent = 'Error loading products.';
      console.error('Error loading products:', error);
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
        (p.description && p.description.trim().length > 0)
          ? p.description
          : 'Sweet, chilled and perfect for market day.';

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
      console.error('Order insert error:', orderError);
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
      console.error('Order items insert error:', itemsError);
      return;
    }

    showOrderModal(orderId);
    cart = {};
    renderCart();
  }

  if (placeOrderBtn) placeOrderBtn.addEventListener('click', placeOrder);
  if (productListEl) loadProducts();
}

// ---------- ADMIN PAGE ----------
if (isAdminPage) {
  const ADMIN_PASSWORD = 'admin12345';

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

    const imageFileInput = document.getElementById('image-file');
    const imageCanvas = document.getElementById('image-canvas');
    const clearImageBtn = document.getElementById('clear-image-btn');
    const useCropBtn = document.getElementById('use-crop-btn');
    const croppedPreviewImg = document.getElementById('cropped-preview');

    const addProductBtn = document.getElementById('add-product-btn');
    const adminProductListEl = document.getElementById('admin-product-list');
    const ordersListEl = document.getElementById('orders-list');
    const refreshOrdersBtn = document.getElementById('refresh-orders-btn');

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

      if (cropStartX !== null && cropStartY !== null && cropEndX !== null && cropEndY !== null) {
        const x = Math.min(cropStartX, cropEndX);
        const y = Math.min(cropStartY, cropEndY);
        const size = Math.min(Math.abs(cropEndX - cropStartX), Math.abs(cropEndY - cropStartY));

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);
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
      if (!imageLoaded || cropStartX === null || cropEndX === null) {
        alert('Select a crop area on the image first.');
        return;
      }

      const x = Math.min(cropStartX, cropEndX);
      const y = Math.min(cropStartY, cropEndY);
      const size = Math.min(Math.abs(cropEndX - cropStartX), Math.abs(cropEndY - cropStartY));

      if (size < 10) {
        alert('Crop area is too small.');
        return;
      }

      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');
      const finalSize = 512;
      croppedCanvas.width = finalSize;
      croppedCanvas.height = finalSize;

      croppedCtx.drawImage(
        imageCanvas,
        x,
        y,
        size,
        size,
        0,
        0,
        finalSize,
        finalSize
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
        extraEl.textContent = `#${p.id}${catText}`;

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
    }

    async function loadOrders() {
      const { data, error } = await client
        .from('orders')
        .select('id, created_at, total_price, order_items ( quantity, products ( name ))')
        .order('id', { ascending: false });

      if (error) {
        ordersListEl.textContent = 'Error loading orders.';
        console.error('Admin load orders error:', error);
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
      const description = descriptionInput.value.trim();

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

      const { error } = await client
        .from('products')
        .insert({
          name,
          price: priceFils,
          is_available: true,
          category: category || null,
          description: description || null,
          image_url: imageUrl || null
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
      imageFileInput.value = '';
      resetImageCropper();

      await loadProductsAdmin();
    }

    addProductBtn.addEventListener('click', addProduct);
    refreshOrdersBtn.addEventListener('click', loadOrders);

    loadProductsAdmin();
    loadOrders();
  }
}
