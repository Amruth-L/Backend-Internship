import { useEffect, useState } from 'react';
import { LoaderCircle, Package, Search, X } from 'lucide-react';

function useDebouncedValue(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  
  return debouncedValue;
}

const getSortParams = (option) => {
  switch (option) {
    case 'newest': return { sortBy: 'created_at', sortOrder: 'desc' };
    case 'oldest': return { sortBy: 'created_at', sortOrder: 'asc' };
    case 'price-low-high': return { sortBy: 'price', sortOrder: 'asc' };
    case 'price-high-low': return { sortBy: 'price', sortOrder: 'desc' };
    case 'name-a-z': return { sortBy: 'name', sortOrder: 'asc' };
    case 'name-z-a': return { sortBy: 'name', sortOrder: 'desc' };
    default: return { sortBy: 'created_at', sortOrder: 'desc' };
  }
};

export default function App() {
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText);
  
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categories, setCategories] = useState([]);
  
  const [sortOption, setSortOption] = useState('newest');
  
  const [products, setProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(['All Categories', ...data.categories]);
        }
      })
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  // Fetch products when search, category, or sort changes
  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setError('');
      setProducts([]);
      setNextCursor(null);
      setHasMore(false);

      const { sortBy, sortOrder } = getSortParams(sortOption);
      const params = new URLSearchParams({ limit: '20' });
      
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }
      if (selectedCategory !== 'All Categories') {
        params.set('category', selectedCategory);
      }
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      try {
        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Unable to load products.');
        }
        
        const json = await response.json();
        setProducts(json.data || []);
        setNextCursor(json.pagination?.next_cursor || null);
        setHasMore(Boolean(json.pagination?.has_more));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Products could not be loaded. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [debouncedSearch, selectedCategory, sortOption]);

  async function loadMoreProducts() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    const { sortBy, sortOrder } = getSortParams(sortOption);
    const params = new URLSearchParams({ limit: '20', cursor: nextCursor });
    
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim());
    }
    if (selectedCategory !== 'All Categories') {
      params.set('category', selectedCategory);
    }
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    try {
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Unable to load more products.');
      }
      
      const json = await response.json();
      setProducts((current) => [...current, ...(json.data || [])]);
      setNextCursor(json.pagination?.next_cursor || null);
      setHasMore(Boolean(json.pagination?.has_more));
    } catch {
      setError('More products could not be loaded. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  function resetFilters() {
    setSearchText('');
    setSelectedCategory('All Categories');
    setSortOption('newest');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-xl shadow-sm shadow-blue-600/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">ProductVault</h1>
          </div>
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {isLoading ? 'Updating...' : `${products.length} Items`}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Controls Section */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 text-slate-900 rounded-xl pl-11 pr-10 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
              placeholder="Search products..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex w-full md:w-auto items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {/* Category Filter */}
            <div className="relative min-w-[160px]">
              <select
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-700 font-medium rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer pr-10"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.length === 0 ? <option>All Categories</option> : null}
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* Sorting */}
            <div className="relative min-w-[180px]">
              <select
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-700 font-medium rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer pr-10"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
                <option value="name-a-z">Name: A to Z</option>
                <option value="name-z-a">Name: Z to A</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center justify-between border border-red-100">
            <span className="font-medium">{error}</span>
            <button 
              onClick={() => setSortOption((s) => s)} 
              className="px-3 py-1 bg-white hover:bg-red-50 rounded-lg text-sm font-medium border border-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Product Area */}
        <section aria-live="polite">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-slate-200/60" />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="h-5 bg-slate-200 rounded-md w-2/3" />
                    <div className="h-7 bg-slate-200 rounded-md w-1/3 mb-2" />
                    <div className="mt-auto h-4 bg-slate-100 rounded-md w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <article key={product.id} className="group flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 relative border-b border-slate-100 flex items-center justify-center p-6 group-hover:from-blue-50/50 group-hover:to-slate-50 transition-colors">
                      <Package className="w-14 h-14 text-slate-300 group-hover:text-blue-300 transition-colors duration-300 group-hover:scale-110" />
                      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-semibold tracking-wide px-3 py-1 rounded-full text-slate-600 border border-slate-200 shadow-sm">
                        {product.category}
                      </span>
                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                      <h2 className="font-semibold text-slate-900 line-clamp-1 mb-1.5 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h2>
                      <p className="text-xl font-bold text-slate-900 mb-4 mt-auto">
                        {Number(product.price || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </p>
                      <div className="flex items-center justify-between text-[13px] text-slate-500 font-medium">
                        <span>Added {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(product.created_at))}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMoreProducts}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-full font-semibold hover:bg-slate-50 hover:text-slate-900 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isLoadingMore ? <LoaderCircle className="w-5 h-5 animate-spin text-blue-600" /> : <Package className="w-5 h-5 text-slate-400" />}
                    {isLoadingMore ? 'Loading more...' : 'Load More Products'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200/50 border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">No products found</h2>
              <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">
                We couldn't find any items matching your current search and filter settings.
              </p>
              <button
                onClick={resetFilters}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-500/20 active:scale-95"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
