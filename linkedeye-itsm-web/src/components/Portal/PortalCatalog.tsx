import { useState } from 'react';
import { ShoppingCart, ChevronDown, ChevronUp, Package, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCatalogCategories } from '../../hooks/useCatalog';
import { useCreateServiceRequest } from '../../hooks/useServiceRequests';

interface CatalogItem {
  id: string;
  name: string;
  shortDescription?: string;
  description?: string;
  estimatedDays?: number;
  price?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  catalogItems?: CatalogItem[];
}

export default function PortalCatalog() {
  const { data: catData, isLoading } = useCatalogCategories();
  const categories: Category[] = catData?.data ?? [];

  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [requestingItem, setRequestingItem] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [confirmation, setConfirmation] = useState<{ number: string } | null>(null);

  const createRequest = useCreateServiceRequest();

  const toggleCategory = (id: string) => {
    setExpandedCat((prev) => (prev === id ? null : id));
    setRequestingItem(null);
  };

  const openRequestForm = (itemId: string) => {
    setRequestingItem((prev) => (prev === itemId ? null : itemId));
    setQuantity(1);
    setNotes('');
    setConfirmation(null);
  };

  const handleSubmit = (item: CatalogItem) => {
    createRequest.mutate(
      { catalogItemId: item.id, quantity, notes },
      {
        onSuccess: (res: any) => {
          const num = res?.data?.number ?? res?.number ?? 'N/A';
          toast.success('Service request submitted!');
          setConfirmation({ number: num });
          setQuantity(1);
          setNotes('');
        },
        onError: () => {
          toast.error('Failed to submit request. Please try again.');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: '#e2e8f0', borderTopColor: '#6366f1' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>
          <ShoppingCart size={24} className="mr-2 inline-block" style={{ color: '#6366f1' }} />
          Service Catalog
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          Browse categories and request the services you need.
        </p>
      </div>

      {categories.length === 0 ? (
        <div
          className="rounded-xl border px-6 py-14 text-center"
          style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
        >
          <Package size={40} className="mx-auto mb-3" style={{ color: '#cbd5e1' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>
            No catalog categories available at this time.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const isExpanded = expandedCat === cat.id;
            const items = cat.catalogItems ?? [];
            return (
              <div
                key={cat.id}
                className={`rounded-xl border transition-shadow ${isExpanded ? 'sm:col-span-2 lg:col-span-3 shadow-md' : 'cursor-pointer hover:shadow-md'}`}
                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: '#0f172a' }}>
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-0.5 text-sm" style={{ color: '#64748b' }}>
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: '#eef2ff', color: '#6366f1' }}
                    >
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={18} style={{ color: '#94a3b8' }} />
                    ) : (
                      <ChevronDown size={18} style={{ color: '#94a3b8' }} />
                    )}
                  </div>
                </button>

                {/* Expanded Items */}
                {isExpanded && (
                  <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: '#e2e8f0' }}>
                    {items.length === 0 ? (
                      <p className="text-sm" style={{ color: '#64748b' }}>
                        No items in this category yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item) => {
                          const isRequesting = requestingItem === item.id;
                          return (
                            <div
                              key={item.id}
                              className="rounded-lg border p-4"
                              style={{ borderColor: '#e2e8f0' }}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                                    {item.name}
                                  </h4>
                                  {item.shortDescription && (
                                    <p className="mt-0.5 text-sm" style={{ color: '#64748b' }}>
                                      {item.shortDescription}
                                    </p>
                                  )}
                                  <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: '#94a3b8' }}>
                                    {item.estimatedDays != null && (
                                      <span>Est. {item.estimatedDays} day{item.estimatedDays !== 1 ? 's' : ''}</span>
                                    )}
                                    {item.price != null && (
                                      <span>
                                        {item.price === 0 ? 'Free' : `$${item.price.toFixed(2)}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => openRequestForm(item.id)}
                                  className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                                  style={{ backgroundColor: '#6366f1' }}
                                >
                                  {isRequesting ? 'Cancel' : 'Request'}
                                </button>
                              </div>

                              {/* Request Form */}
                              {isRequesting && !confirmation && (
                                <div
                                  className="mt-4 space-y-3 rounded-lg border p-4"
                                  style={{ borderColor: '#e2e8f0', backgroundColor: '#F8FAFC' }}
                                >
                                  <div>
                                    <label className="mb-1 block text-xs font-medium" style={{ color: '#0f172a' }}>
                                      Quantity
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={quantity}
                                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                      className="w-24 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
                                      style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium" style={{ color: '#0f172a' }}>
                                      Notes
                                    </label>
                                    <textarea
                                      value={notes}
                                      onChange={(e) => setNotes(e.target.value)}
                                      rows={3}
                                      placeholder="Add any details about your request..."
                                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 placeholder:text-slate-400"
                                      style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleSubmit(item)}
                                    disabled={createRequest.isPending}
                                    className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#6366f1' }}
                                  >
                                    {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
                                  </button>
                                </div>
                              )}

                              {/* Confirmation */}
                              {isRequesting && confirmation && (
                                <div
                                  className="mt-4 flex items-center gap-3 rounded-lg border p-4"
                                  style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}
                                >
                                  <CheckCircle size={20} style={{ color: '#16a34a' }} />
                                  <div>
                                    <p className="text-sm font-medium" style={{ color: '#065f46' }}>
                                      Request submitted successfully!
                                    </p>
                                    <p className="text-xs" style={{ color: '#059669' }}>
                                      Request number: <strong>{confirmation.number}</strong>
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
