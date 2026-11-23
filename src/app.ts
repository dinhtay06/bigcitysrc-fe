type SiteSettings = {
  status: string;
  launcherUrl: string;
  discordUrl: string;
  trailerUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  members: { name: string; role: string }[];
};
type NewsArticle = { category: string; title: string; image: string; alt: string; body: string };
type Session = { username?: string; admin?: boolean };
type Rules = { title: string; body: string }[];
type ResidentView = 'application' | 'support' | 'staff';
type RequestDetails = {
  id: string; username: string; title: string; body: string;
  status: 'pending' | 'approved' | 'rejected' | 'answered' | 'cancelled' | 'expired' | 'payment_review';
  createdAt: string; reviewedAt: string; revision: string; reply: string;
};
type Deposit = RequestDetails & {
  kind: 'deposit'; amount: string; reference: string; bank: string; account: string; holder: string;
  provider?: string; checkoutUrl?: string; amountPaid?: string; cancelRequested?: string; expiresAt?: string;
};
type ResidentRequest = (RequestDetails & { kind: 'application' | 'support' }) | Deposit;
type Wallet = { enabled: boolean; balance: number; min: number; max: number; items: Deposit[] };

const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
const title = document.querySelector<HTMLElement>('#dialog-title')!;
const content = document.querySelector<HTMLElement>('#dialog-content')!;
const nav = document.querySelector<HTMLElement>('#nav')!;
const menu = document.querySelector<HTMLButtonElement>('#menu')!;

function openDialog(heading: string, ...body: Node[]) {
  title.textContent = heading;
  content.replaceChildren(...body);
  if (!dialog.open) dialog.showModal();
}

function paragraph(message: string) {
  const p = document.createElement('p');
  p.textContent = message;
  return p;
}

function button(label: string, style = 'btn') {
  const element = document.createElement('button');
  element.className = style;
  element.textContent = label;
  return element;
}

function httpsLink(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Thiếu API.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Không thể kết nối.');
  return data as T;
}

function loadContent<T>(file: string) {
  return json<T>(`api/${file}`).catch(() => json<T>(`data/${file}.json`));
}

function renderNews(articles: NewsArticle[]) {
  const cards = document.querySelector('#news-list')!;
  cards.replaceChildren(...articles.map((article) => {
    const card = document.createElement('article');
    card.className = 'card';
    const image = document.createElement('img');
    const url = httpsLink(article.image);
    if (url) image.src = url.href;
    image.alt = article.alt;
    image.loading = 'lazy';
    const category = document.createElement('div');
    category.className = 'meta';
    category.textContent = article.category;
    const heading = document.createElement('h3');
    heading.textContent = article.title;
    const read = button('ĐỌC BẢN TIN ↗', 'read-news');
    read.onclick = () => openDialog(article.title, paragraph(article.body));
    card.append(image, category, heading, read);
    return card;
  }));
  if (articles.length === 0) cards.append(paragraph('Chưa có bản tin.'));
}

function configureLink(id: string, label: string, value: string, pending: string) {
  const trigger = document.querySelector<HTMLButtonElement>(`#${id}`)!;
  const url = httpsLink(value);
  if (!url) {
    trigger.onclick = () => openDialog(label, paragraph(pending));
    return;
  }
  const link = document.createElement('a');
  link.href = url.href;
  link.className = trigger.className;
  link.textContent = label + ' ↗';
  trigger.replaceWith(link);
}

const defaults: SiteSettings = {
  status: 'SẮP RA MẮT', launcherUrl: '', discordUrl: '', trailerUrl: '', tiktokUrl: '', youtubeUrl: '', members: [],
};
function configureSite(settings: SiteSettings) {
  document.querySelector('#server-status')!.textContent = settings.status;
  configureLink('launcher', 'TẢI LAUNCHER', settings.launcherUrl, 'Launcher của BIG CITY đang được chuẩn bị.');
  configureLink('discord', 'VÀO DISCORD', settings.discordUrl, 'Link Discord sẽ được cập nhật khi cộng đồng mở cửa.');
  configureLink('discord-hero', 'DISCORD', settings.discordUrl, 'Link Discord sẽ được cập nhật khi cộng đồng mở cửa.');
  configureLink('tiktok', 'TIKTOK', settings.tiktokUrl, 'Kênh TikTok sẽ được cập nhật khi có link chính thức.');
  configureLink('youtube', 'YOUTUBE', settings.youtubeUrl, 'Kênh YouTube sẽ được cập nhật khi có link chính thức.');
  configureLink('trailer', 'XEM TRAILER', settings.trailerUrl, 'BIG CITY là thành phố của những cuộc gặp bất ngờ, những chuyến xe sau nửa đêm và những câu chuyện do chính người chơi tạo nên.');
  const members = document.querySelector('#city-members')!;
  const roster = settings.members?.length ? settings.members : [{ name: 'BIG CITY', role: 'Thông tin đội ngũ đang được cập nhật' }];
  members.replaceChildren(...roster.map((member, index) => {
    const row = document.createElement('li');
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = member.name;
    const role = document.createElement('small');
    role.textContent = member.role;
    details.append(name, role);
    row.append(number, details);
    return row;
  }));
}

async function openResident(destination: 'portal' | 'wallet' = 'portal') {
  const heading = destination === 'wallet' ? 'NẠP TIỀN' : 'CỔNG CƯ DÂN';
  const loading = paragraph('Đang kết nối…');
  const onSignIn = destination === 'wallet' ? showWallet : showResident;
  openDialog(heading, loading);
  try {
    const session = await json<Session>('api/session');
    if (!dialog.open || !loading.isConnected) return;
    if (session.username) onSignIn(session);
    else showAuthForm(false, onSignIn);
  } catch {
    if (dialog.open && loading.isConnected) {
      openDialog(heading, paragraph('Tính năng này mở khi website kết nối với máy chủ BIG CITY.'));
    }
  }
}

function showResident(session: Session) {
  const logout = button('ĐĂNG XUẤT', 'outline');
  const status = paragraph('');
  status.setAttribute('role', 'status');
  logout.onclick = async () => {
    logout.disabled = true;
    try {
      await json<Session>('api/logout', { method: 'POST' });
      if (dialog.open && logout.isConnected) showAuthForm(false);
    } catch {
      status.textContent = 'Không thể đăng xuất. Thử lại sau.';
      logout.disabled = false;
    }
  };
  const actions = document.createElement('div');
  actions.className = 'portal-actions';
  const application = button('HỒ SƠ NHẬP VAI');
  const support = button('HỖ TRỢ', 'outline');
  const wallet = button('NẠP TIỀN & SỐ DƯ', 'outline');
  application.onclick = () => showRequests(session, 'application');
  support.onclick = () => showRequests(session, 'support');
  wallet.onclick = () => showWallet(session);
  actions.append(application, wallet, support);
  if (session.admin) {
    const staff = button('QUẢN TRỊ', 'outline');
    staff.onclick = () => showRequests(session, 'staff');
    actions.append(staff);
  }
  actions.append(logout);
  openDialog('CỔNG CƯ DÂN', paragraph(`Chào mừng ${session.username} đến BIG CITY.`), actions, status);
}

function showAuthForm(register: boolean, onSignIn: (session: Session) => void = showResident) {
  const form = document.createElement('form');
  form.className = 'resident-form';
  const username = document.createElement('input');
  username.name = 'username';
  username.autocomplete = 'username';
  username.required = true;
  username.pattern = '[A-Za-z0-9_]{3,24}';
  username.title = '3–24 ký tự gồm chữ, số và dấu gạch dưới';
  const password = document.createElement('input');
  password.name = 'password';
  password.type = 'password';
  password.autocomplete = register ? 'new-password' : 'current-password';
  password.required = true;
  password.minLength = 10;
  password.maxLength = 128;
  const userLabel = document.createElement('label');
  userLabel.append('Tên tài khoản', username);
  const passwordLabel = document.createElement('label');
  passwordLabel.append('Mật khẩu (ít nhất 10 ký tự)', password);
  const status = paragraph('');
  status.setAttribute('role', 'status');
  const submit = button(register ? 'TẠO TÀI KHOẢN' : 'ĐĂNG NHẬP');
  const toggle = button(register ? 'ĐÃ CÓ TÀI KHOẢN' : 'TẠO TÀI KHOẢN', 'outline');
  toggle.type = 'button';
  toggle.onclick = () => showAuthForm(!register, onSignIn);
  form.append(userLabel, passwordLabel);
  const confirmation = document.createElement('input');
  if (register) {
    confirmation.type = 'password';
    confirmation.autocomplete = 'new-password';
    confirmation.required = true;
    confirmation.maxLength = 128;
    form.append(field('Nhập lại mật khẩu', confirmation));
  }
  form.append(status, submit, toggle);
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (register && confirmation.value !== password.value) {
      status.textContent = 'Hai mật khẩu chưa khớp.';
      confirmation.focus();
      return;
    }
    submit.disabled = true;
    toggle.disabled = true;
    status.textContent = 'Đang xử lý…';
    try {
      const data = await json<Session>(`api/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: new URLSearchParams({ username: username.value, password: password.value }),
      });
      if (dialog.open && form.isConnected && data.username) onSignIn(data);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Thử lại sau.';
    } finally {
      submit.disabled = false;
      toggle.disabled = false;
    }
  };
  openDialog(register ? 'TẠO TÀI KHOẢN' : 'CỔNG CƯ DÂN', form);
  username.focus();
}

async function openRules(back?: () => void) {
  const body = paragraph('Đang tải luật nhập vai…');
  openDialog('LUẬT NHẬP VAI', body);
  try {
    const rules = await loadContent<Rules>('rules');
    if (!dialog.open || !body.isConnected) return;
    const list = document.createElement('ol');
    list.className = 'rule-list';
    for (const rule of rules) {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      heading.textContent = rule.title;
      item.append(heading, paragraph(rule.body));
      list.append(item);
    }
    body.replaceWith(list);
  } catch {
    body.textContent = 'Không tải được luật nhập vai. Vui lòng thử lại.';
  }
  if (back && dialog.open && title.textContent === 'LUẬT NHẬP VAI') {
    const previous = button('QUAY LẠI', 'outline');
    previous.onclick = back;
    content.append(previous);
  }
}

const requestHeadings = { application: 'HỒ SƠ NHẬP VAI', support: 'HỖ TRỢ CƯ DÂN', staff: 'QUẢN TRỊ YÊU CẦU' };
const requestStatuses = {
  pending: 'Đang chờ xử lý', approved: 'Đã duyệt', rejected: 'Cần gửi lại', answered: 'Đã phản hồi',
  cancelled: 'Đã hủy', expired: 'Đã hết hạn', payment_review: 'Cần đối soát',
};
const depositStatuses = { ...requestStatuses, pending: 'Chờ thanh toán', approved: 'Đã cộng số dư', rejected: 'Không thành công' };
const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const walletPath = 'api/resident/deposits';

async function showWallet(session: Session) {
  const refresh = () => showWallet(session);
  const back = button('VỀ CỔNG CƯ DÂN', 'outline');
  back.onclick = () => showResident(session);
  const reload = button('CẬP NHẬT', 'outline');
  reload.onclick = refresh;
  const actions = document.createElement('div');
  actions.className = 'portal-actions';
  actions.append(back, reload);
  const result = document.createElement('div');
  result.append(paragraph('Đang tải số dư…'));
  openDialog('NẠP TIỀN & SỐ DƯ', actions, result);
  try {
    const wallet = await json<Wallet>(walletPath);
    if (!dialog.open || !result.isConnected) return;
    const balance = document.createElement('h3');
    balance.textContent = `Số dư web: ${vnd.format(wallet.balance)}`;
    result.replaceChildren(balance);
    const pending = wallet.items.some(item => item.status === 'pending');
    if (!wallet.enabled) result.append(paragraph('BIG CITY chưa mở yêu cầu nạp mới.'));
    if (wallet.enabled && !pending) {
      const form = document.createElement('form');
      form.className = 'resident-form request-card';
      const amount = document.createElement('input');
      amount.name = 'amount';
      amount.type = 'number';
      amount.inputMode = 'numeric';
      amount.min = String(wallet.min);
      amount.max = String(wallet.max);
      amount.step = '1';
      amount.required = true;
      form.append(field(`Số tiền nạp (${vnd.format(wallet.min)} – ${vnd.format(wallet.max)})`, amount));
      wireRequestForm(form, walletPath, 'TẠO YÊU CẦU NẠP', refresh);
      result.append(form);
    }
    if (!wallet.items.length) result.append(paragraph('Chưa có giao dịch nạp tiền.'));
    for (const item of wallet.items) result.append(requestCard(item, 'wallet', walletPath, refresh));
    if (wallet.enabled && wallet.items.some(item => item.provider === 'payos' && item.status === 'pending')) {
      const snapshot = JSON.stringify(wallet);
      const poll = async () => {
        if (!dialog.open || !result.isConnected) return;
        try {
          const latest = await json<Wallet>(walletPath);
          if (!dialog.open || !result.isConnected) return;
          if (JSON.stringify(latest) !== snapshot) {
            refresh();
            return;
          }
        } catch {
          // Keep the current view available while the connection recovers.
        }
        window.setTimeout(poll, 5000);
      };
      window.setTimeout(poll, 5000);
    }
  } catch (error) {
    result.replaceChildren(paragraph(error instanceof Error ? error.message : 'Không tải được số dư.'));
  }
}

async function showRequests(session: Session, view: ResidentView) {
  const path = view === 'staff' ? 'api/staff/requests' : `api/resident/${view}`;
  const back = button('VỀ CỔNG CƯ DÂN', 'outline');
  back.onclick = () => showResident(session);
  const result = document.createElement('div');
  result.append(paragraph('Đang tải…'));
  openDialog(requestHeadings[view], back, result);
  try {
    const records = await json<ResidentRequest[]>(path);
    if (!dialog.open || !result.isConnected) return;
    const refresh = () => showRequests(session, view);
    result.replaceChildren(...records.map(record => requestCard(record, view, path, refresh)));
    if (view === 'staff') {
      if (!records.length) result.append(paragraph('Chưa có yêu cầu nào.'));
    } else {
      const canSubmit = view === 'application'
        ? !records.length || records[0].status === 'rejected'
        : !records.some(record => record.status === 'pending');
      if (canSubmit) result.append(requestForm(view, path, refresh));
    }
  } catch (error) {
    result.replaceChildren(paragraph(error instanceof Error ? error.message : 'Không tải được yêu cầu.'));
    const retry = button('THỬ LẠI', 'outline');
    retry.onclick = () => showRequests(session, view);
    result.append(retry);
  }
}

function requestCard(record: ResidentRequest, view: ResidentView | 'wallet', path: string, refresh: () => void) {
  const card = document.createElement('article');
  card.className = 'request-card';
  const heading = document.createElement('h3');
  heading.textContent = record.title;
  const date = new Date(record.createdAt).toLocaleString('vi-VN');
  const kind = { application: 'Hồ sơ nhập vai', support: 'Hỗ trợ', deposit: 'Nạp tiền' }[record.kind];
  const statuses = record.kind === 'deposit' && record.provider === 'payos' ? depositStatuses : requestStatuses;
  const meta = paragraph(`${kind} · ${statuses[record.status]} · ${date}`);
  meta.className = 'request-meta';
  card.append(heading, meta);
  if (view === 'staff') card.append(paragraph(`Tài khoản: ${record.username}`));
  if (record.kind === 'deposit' && record.provider === 'payos') {
    renderPayosDetails(card, record, view === 'wallet', refresh);
  } else if (record.kind === 'deposit') {
    const reference = document.createElement('code');
    reference.textContent = record.reference;
    const description = paragraph('Nội dung chuyển khoản: ');
    description.append(reference);
    card.append(paragraph(`Số tiền: ${vnd.format(Number(record.amount))}`), description);
    if (record.status === 'pending') {
      card.append(paragraph(`Ngân hàng: ${record.bank}\nSố tài khoản: ${record.account}\nChủ tài khoản: ${record.holder}`));
      if (view === 'wallet') {
        card.append(paragraph('Chuyển đúng số tiền và nội dung ở trên một lần. Số dư sẽ cập nhật sau khi quản trị viên đối soát.'));
      }
    }
  } else {
    card.append(paragraph(record.body));
  }
  if (record.reply) card.append(paragraph(`Phản hồi của ban quản trị: ${record.reply}`));
  if (view === 'staff' && record.status === 'pending' && !(record.kind === 'deposit' && record.provider === 'payos')) {
    const form = document.createElement('form');
    form.className = 'resident-form';
    const select = document.createElement('select');
    select.name = 'status';
    if (record.kind === 'deposit') {
      select.add(new Option('Xác nhận đã nhận tiền', 'approved'));
      select.add(new Option('Từ chối yêu cầu nạp', 'rejected'));
    } else if (record.kind === 'application') {
      select.add(new Option('Duyệt hồ sơ', 'approved'));
      select.add(new Option('Yêu cầu gửi lại', 'rejected'));
    } else {
      select.add(new Option('Gửi phản hồi và đóng yêu cầu', 'answered'));
    }
    const reply = document.createElement('textarea');
    reply.name = 'reply';
    reply.maxLength = 1000;
    reply.minLength = 3;
    reply.required = record.kind === 'support';
    form.append(field('Kết quả', select));
    if (record.kind === 'deposit') {
      const proof = document.createElement('div');
      const received = document.createElement('input');
      received.name = 'receivedAmount';
      received.inputMode = 'numeric';
      received.pattern = '[0-9]+';
      received.required = true;
      const transaction = document.createElement('input');
      transaction.name = 'transaction';
      transaction.required = true;
      transaction.minLength = 3;
      transaction.maxLength = 100;
      proof.append(
        paragraph('Đối chiếu số tiền và nội dung chuyển khoản với sao kê trước khi xác nhận.'),
        field('Số tiền thực nhận (VNĐ)', received),
        field('Mã giao dịch trên sao kê', transaction),
      );
      form.append(proof);
      select.onchange = () => {
        const approving = select.value === 'approved';
        proof.hidden = !approving;
        received.disabled = transaction.disabled = !approving;
        reply.required = !approving;
      };
    } else {
      select.onchange = () => { reply.required = select.value !== 'approved'; };
    }
    form.append(field('Phản hồi của quản trị viên', reply));
    wireRequestForm(form, path, 'LƯU KẾT QUẢ', refresh, { id: record.id, revision: record.revision });
    card.append(form);
  }
  return card;
}

function renderPayosDetails(card: HTMLElement, record: Deposit, resident: boolean, refresh: () => void) {
  card.append(paragraph(`Mã đơn payOS: ${record.reference}`), paragraph(`Số tiền: ${vnd.format(Number(record.amount))}`));
  if (record.status === 'approved' && record.reviewedAt) {
    card.append(paragraph(`Đã cộng vào số dư lúc ${new Date(record.reviewedAt).toLocaleString('vi-VN')}.`));
  }
  if (Number(record.amountPaid) > 0 && record.status !== 'approved') {
    card.append(paragraph(`payOS ghi nhận đã nhận: ${vnd.format(Number(record.amountPaid))}.`));
  }
  if (record.status === 'payment_review') {
    card.append(paragraph('Số tiền cần được đối soát. Gửi mã đơn payOS trong mục Hỗ trợ để BIG CITY kiểm tra.'));
  }
  if (record.status !== 'pending') return;
  if (record.cancelRequested === 'true') {
    card.append(paragraph('Đang chờ payOS xác nhận hủy hoặc cập nhật kết quả thanh toán.'));
    return;
  }
  const checkout = httpsLink(record.checkoutUrl ?? '');
  if (checkout?.hostname !== 'pay.payos.vn') {
    card.append(paragraph('Đang chuẩn bị link payOS. Trạng thái sẽ tự cập nhật.'));
    return;
  }
  if (!resident) return;
  if (Number(record.expiresAt) > 0) {
    card.append(paragraph(`Link hết hạn lúc ${new Date(Number(record.expiresAt) * 1000).toLocaleString('vi-VN')}.`));
  }
  const link = document.createElement('a');
  link.className = 'btn';
  link.href = checkout.href;
  link.textContent = 'THANH TOÁN TRÊN PAYOS ↗';
  card.append(link);
  if (Number(record.amountPaid || 0) === 0) {
    const cancel = document.createElement('form');
    wireRequestForm(cancel, `${walletPath}/cancel`, 'HỦY YÊU CẦU', refresh, { id: record.id });
    card.append(cancel);
  }
}

function field(label: string, input: HTMLElement) {
  const element = document.createElement('label');
  element.append(label, input);
  return element;
}

function requestForm(view: Exclude<ResidentView, 'staff'>, path: string, refresh: () => void) {
  const application = view === 'application';
  const form = document.createElement('form');
  form.className = 'resident-form request-card';
  const name = document.createElement('input');
  name.name = 'title';
  name.required = true;
  name.minLength = 3;
  name.maxLength = 80;
  const body = document.createElement('textarea');
  body.name = 'body';
  body.required = true;
  body.minLength = application ? 40 : 10;
  body.maxLength = 1500;
  body.rows = 5;
  form.append(
    field(application ? 'Tên nhân vật (3–80 ký tự)' : 'Tiêu đề yêu cầu (3–80 ký tự)', name),
    field(application ? 'Tiểu sử và mục tiêu nhân vật (40–1.500 ký tự)' : 'Mô tả vấn đề (10–1.500 ký tự)', body),
  );
  if (application) {
    const rules = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Đọc luật nhập vai';
    const list = document.createElement('ul');
    rules.append(summary, list);
    const agree = document.createElement('input');
    agree.type = 'checkbox';
    agree.name = 'rules';
    agree.value = 'yes';
    agree.required = true;
    agree.disabled = true;
    loadContent<Rules>('rules').then(items => {
      for (const item of items) {
        const rule = document.createElement('li');
        rule.textContent = `${item.title} — ${item.body}`;
        list.append(rule);
      }
      agree.disabled = false;
    }, () => { list.textContent = 'Không tải được luật. Hãy mở lại hồ sơ để thử lại.'; });
    const label = document.createElement('label');
    label.className = 'rules-check';
    label.append(agree, 'Tôi đã đọc và đồng ý với luật nhập vai.');
    form.append(rules, label);
  }
  wireRequestForm(form, path, application ? 'GỬI HỒ SƠ' : 'GỬI YÊU CẦU', refresh);
  return form;
}

function wireRequestForm(form: HTMLFormElement, path: string, label: string, refresh: () => void, extra = {}) {
  const status = paragraph('');
  status.setAttribute('role', 'status');
  const submit = button(label);
  form.append(status, submit);
  form.onsubmit = async event => {
    event.preventDefault();
    submit.disabled = true;
    status.textContent = 'Đang gửi…';
    const values = Object.fromEntries([...new FormData(form)].map(([name, value]) => [name, String(value)]));
    try {
      await json(path, { method: 'POST', body: new URLSearchParams({ ...values, ...extra }) });
      if (dialog.open && form.isConnected) refresh();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Không gửi được yêu cầu.';
      submit.disabled = false;
    }
  };
}

document.querySelector<HTMLButtonElement>('#resident')!.onclick = () => openResident();
document.querySelector<HTMLButtonElement>('#resident-start')!.onclick = () => openResident();
document.querySelector<HTMLButtonElement>('#wallet-start')!.onclick = () => openResident('wallet');
document.querySelector<HTMLButtonElement>('#rules')!.onclick = () => openRules();
const entry = document.querySelector<HTMLElement>('#entry-screen')!;
const site = document.querySelector<HTMLElement>('#site')!;
const enter = document.querySelector<HTMLButtonElement>('#enter-site')!;
const paymentReturn = new URLSearchParams(location.search).get('wallet') === '1';
if (paymentReturn) {
  history.replaceState({ ...history.state, enteredBigCity: true }, '', location.pathname);
  void openResident('wallet');
} else if (!location.hash && !history.state?.enteredBigCity) {
  entry.hidden = false;
  site.hidden = true;
}
enter.onclick = () => {
  history.replaceState({ ...history.state, enteredBigCity: true }, '');
  entry.hidden = true;
  site.hidden = false;
  document.querySelector<HTMLElement>('.hero h1')!.focus({ preventScroll: true });
};
const membersToggle = document.querySelector<HTMLButtonElement>('#members-toggle')!;
const aboutToggle = document.querySelector<HTMLButtonElement>('#about-toggle')!;
function showCityPanel(members: boolean) {
  membersToggle.setAttribute('aria-pressed', String(members));
  aboutToggle.setAttribute('aria-pressed', String(!members));
  document.querySelector<HTMLElement>('#city-members')!.hidden = !members;
  document.querySelector<HTMLElement>('#city-about')!.hidden = members;
}
membersToggle.onclick = () => showCityPanel(true);
aboutToggle.onclick = () => showCityPanel(false);
menu.onclick = () => menu.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
nav.querySelectorAll('a').forEach((link) => link.onclick = () => {
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
});

loadContent<SiteSettings>('site').then(configureSite, () => configureSite(defaults));
loadContent<NewsArticle[]>('news').then(renderNews, () => {
  document.querySelector('#news-list')!.replaceChildren(paragraph('Không tải được bản tin.'));
});
