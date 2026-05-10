import * as React from 'react';
import { Plus, Search, Pencil, Trash2, Loader2, Box } from 'lucide-react';
import { AdminModal, ConfirmDialog, Field, TextInput, TextArea } from './AdminModal';
import { Dropdown } from './Dropdown';
import { ImageUpload } from './ImageUpload';
import {
  getAllProductsRaw,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
} from '../../services/productService';

const BRANDS = ['Doscom', 'Noma', 'Nội bộ', 'Claude'];

const emptyForm: ProductInput = {
  product_id: '',
  product_code: '',
  product_name: '',
  brand: 'Doscom',
  category: '',
  short_description: '',
  feature_1: '',
  feature_2: '',
  feature_3: '',
  feature_4: '',
  thumbnail_url: '',
  status: 'active',
};

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

interface ProductManagementProps {
  onDataChanged?: () => void | Promise<void>;
}

export default function ProductManagement({ onDataChanged }: ProductManagementProps = {}) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [brandFilter, setBrandFilter] = React.useState<string>('all');

  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<ProductInput>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllProductsRaw();
      setRows(data);
    } catch (e: any) {
      console.error(e);
      alert('Không tải được danh sách sản phẩm: ' + (e?.message || e));
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = normalize(search.trim());
    return rows.filter(r => {
      if (brandFilter !== 'all' && r.brand !== brandFilter) return false;
      if (!q) return true;
      return (
        normalize(r.product_id || '').includes(q) ||
        normalize(r.product_code || '').includes(q) ||
        normalize(r.product_name || '').includes(q) ||
        normalize(r.category || '').includes(q)
      );
    });
  }, [rows, search, brandFilter]);

  const openNew = () => {
    setForm({ ...emptyForm, product_id: `P_${Date.now().toString(36).toUpperCase()}` });
    setEditing({});
    setError(null);
  };

  const openEdit = (row: any) => {
    setForm({
      product_id: row.product_id || '',
      product_code: row.product_code || '',
      product_name: row.product_name || '',
      brand: row.brand || 'Doscom',
      category: row.category || '',
      short_description: row.short_description || '',
      feature_1: row.feature_1 || '',
      feature_2: row.feature_2 || '',
      feature_3: row.feature_3 || '',
      feature_4: row.feature_4 || '',
      thumbnail_url: row.thumbnail_url || '',
      status: row.status || 'active',
    });
    setEditing(row);
    setError(null);
  };

  const closeModal = () => { if (!saving) { setEditing(null); setError(null); } };
  const isEditMode = editing && editing.product_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.product_id.trim()) { setError('Mã sản phẩm bắt buộc'); return; }
    if (!form.product_name.trim()) { setError('Tên sản phẩm bắt buộc'); return; }
    if (!form.brand) { setError('Nhóm đào tạo bắt buộc'); return; }
    if (!form.category.trim()) { setError('Danh mục bắt buộc'); return; }

    setSaving(true);
    try {
      if (isEditMode) {
        const { product_id, ...rest } = form;
        await updateProduct(product_id, rest);
      } else {
        await createProduct(form);
      }
      await refresh();
      await onDataChanged?.();
      setEditing(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Không lưu được sản phẩm');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.product_id);
      await refresh();
      await onDataChanged?.();
      setDeleteTarget(null);
    } catch (e: any) {
      console.error(e);
      alert('Không xóa được: ' + (e?.message || e));
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 bg-zinc-900/50 px-5 py-3 rounded-2xl border border-zinc-800/50 w-full sm:w-[320px] focus-within:ring-2 focus-within:ring-emerald-500/20">
            <Search className="w-4 h-4 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo mã, tên..." className="bg-transparent border-none outline-none text-[11px] w-full text-zinc-200 placeholder:text-zinc-700 font-bold uppercase tracking-[0.05em]" />
          </div>
          <Dropdown
            value={brandFilter}
            onChange={setBrandFilter}
            options={[
              { value: 'all', label: 'Tất cả nhóm đào tạo' },
              ...BRANDS.map(b => ({ value: b, label: b })),
            ]}
            className="min-w-[200px]"
          />
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{filtered.length} kết quả</span>
        </div>
        <button onClick={openNew} className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          Thêm sản phẩm
        </button>
      </div>

      <div className="rounded-[2rem] border border-zinc-900 overflow-hidden bg-[#0C0C0E]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/50">
                {['Mã', 'Mã SKU', 'Tên sản phẩm', 'Nhóm đào tạo', 'Danh mục', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-4 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-zinc-700 text-xs font-bold uppercase tracking-widest">
                  <Box className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                  Chưa có sản phẩm nào
                </td></tr>
              ) : filtered.map(row => (
                <tr key={row.product_id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                  <td className="px-4 py-4 text-xs font-mono font-bold text-emerald-500 whitespace-nowrap">{row.product_id}</td>
                  <td className="px-4 py-4 text-xs font-bold text-zinc-400 whitespace-nowrap">{row.product_code || '—'}</td>
                  <td className="px-4 py-4 text-sm font-bold text-zinc-200 max-w-[240px] truncate" title={row.product_name}>{row.product_name}</td>
                  <td className="px-4 py-4"><span className="inline-block whitespace-nowrap text-[10px] font-black text-zinc-300 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-lg">{row.brand}</span></td>
                  <td className="px-4 py-4 text-xs font-bold text-zinc-400 max-w-[180px] truncate" title={row.category}>{row.category}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-block whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${row.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>{row.status === 'active' ? 'Hoạt động' : 'Ẩn'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(row)} className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500 flex items-center justify-center transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(row)} className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        open={editing !== null}
        onClose={closeModal}
        title={isEditMode ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
        subtitle={isEditMode ? `Mã: ${form.product_id}` : 'Nhập thông tin sản phẩm'}
        size="xl"
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50">Huỷ</button>
            <button type="submit" form="product-form" disabled={saving} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'ĐANG LƯU...' : isEditMode ? 'CẬP NHẬT' : 'TẠO MỚI'}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-400">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Mã sản phẩm">
              <TextInput value={form.product_id} disabled placeholder="P_..." />
            </Field>
            <Field label="Mã SKU" hint="VD: DA-010, CAR-001">
              <TextInput value={form.product_code} onChange={e => setForm({ ...form, product_code: e.target.value })} placeholder="DA-010" />
            </Field>
          </div>

          <Field label="Tên sản phẩm" required>
            <TextInput value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} required />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nhóm đào tạo" required>
              <Dropdown
                value={form.brand}
                onChange={(v) => setForm({ ...form, brand: v })}
                options={BRANDS.map(b => ({ value: b, label: b }))}
                className="w-full"
              />
            </Field>
            <Field label="Danh mục" required>
              <TextInput value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
            </Field>
          </div>

          <Field label="Mô tả ngắn">
            <TextArea value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} rows={3} />
          </Field>

          <Field label="Tính năng nổi bật" hint="Tối đa 4 tính năng — mỗi dòng 1 ý">
            <div className="space-y-2">
              <TextInput value={form.feature_1} onChange={e => setForm({ ...form, feature_1: e.target.value })} placeholder="Tính năng 1" />
              <TextInput value={form.feature_2} onChange={e => setForm({ ...form, feature_2: e.target.value })} placeholder="Tính năng 2" />
              <TextInput value={form.feature_3} onChange={e => setForm({ ...form, feature_3: e.target.value })} placeholder="Tính năng 3" />
              <TextInput value={form.feature_4} onChange={e => setForm({ ...form, feature_4: e.target.value })} placeholder="Tính năng 4" />
            </div>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Ảnh thumbnail">
              <ImageUpload
                value={form.thumbnail_url || ''}
                onChange={url => setForm({ ...form, thumbnail_url: url })}
                folder="product-thumbnails"
                shape="wide"
              />
            </Field>
            <Field label="Trạng thái">
              <Dropdown
                value={form.status || 'active'}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: 'active', label: 'Đang hoạt động' },
                  { value: 'inactive', label: 'Tạm ẩn' },
                ]}
                className="w-full"
              />
            </Field>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa sản phẩm"
        message={`Bạn chắc chắn muốn xóa "${deleteTarget?.product_name}" (${deleteTarget?.product_id})?`}
        confirmLabel="XÓA"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
