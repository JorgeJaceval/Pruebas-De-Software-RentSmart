import { useEffect, useMemo, useState } from 'react';
import PublicSpaceCard from './PublicSpaceCard';
import { availabilityNotice, getPublicSpaces, type PublicSpace } from './publicSpaces';
import { spaceCategories } from './spaces';

type CatalogState = { status: 'loading' | 'loaded' | 'error'; spaces: PublicSpace[] };
type Filters = {
  search: string; category: string; commune: string; minimumPrice: string;
  maximumPrice: string; minimumCapacity: string; sort: string;
};

const emptyFilters: Filters = {
  search: '', category: '', commune: '', minimumPrice: '', maximumPrice: '', minimumCapacity: '', sort: 'default',
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('es-CL');
}

function isIntegerInput(value: string) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
}

export default function Catalog() {
  const [state, setState] = useState<CatalogState>({ status: 'loading', spaces: [] });
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const result = useMemo(() => {
    const search = normalize(filters.search);
    const commune = normalize(filters.commune);
    const minimumPrice = filters.minimumPrice === '' ? null : Number(filters.minimumPrice);
    const maximumPrice = filters.maximumPrice === '' ? null : Number(filters.maximumPrice);
    const minimumCapacity = filters.minimumCapacity === '' ? null : Number(filters.minimumCapacity);
    if ([filters.minimumPrice, filters.maximumPrice].some((price) => price !== '' && !isIntegerInput(price))) {
      return { error: 'Los precios deben ser enteros no negativos.', spaces: [] };
    }
    if (minimumPrice !== null && maximumPrice !== null && minimumPrice > maximumPrice) {
      return { error: 'El precio mínimo no puede superar al máximo.', spaces: [] };
    }
    if (minimumCapacity !== null && (!isIntegerInput(filters.minimumCapacity) || minimumCapacity < 1 || minimumCapacity > 100)) {
      return { error: 'La capacidad mínima debe ser un entero entre 1 y 100.', spaces: [] };
    }
    const spaces = state.spaces.filter((space) =>
      (!search || normalize(space.name).includes(search) || normalize(space.description).includes(search)) &&
      (!filters.category || space.category === filters.category) &&
      (!commune || normalize(space.commune) === commune) &&
      (minimumPrice === null || space.price_per_hour >= minimumPrice) &&
      (maximumPrice === null || space.price_per_hour <= maximumPrice) &&
      (minimumCapacity === null || space.capacity >= minimumCapacity));
    if (filters.sort === 'price-asc' || filters.sort === 'price-desc') {
      const direction = filters.sort === 'price-asc' ? 1 : -1;
      spaces.sort((left, right) => direction * (left.price_per_hour - right.price_per_hour) || left.id.localeCompare(right.id));
    }
    return { error: '', spaces };
  }, [filters, state.spaces]);

  function updateFilter(field: keyof Filters, value: string) {
    setFilters((previous) => ({ ...previous, [field]: value }));
  }

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', spaces: [] });
    getPublicSpaces(controller.signal)
      .then((spaces) => { if (!controller.signal.aborted) setState({ status: 'loaded', spaces }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error', spaces: [] }); });
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <div className="catalog-heading"><p className="eyebrow">ENCUENTRA TU PRÓXIMO ESPACIO</p>
        <h1 id="catalog-title">Explorar catálogo</h1>
        <p>Conoce los lugares que otras personas comparten para reunirse, trabajar o crear.</p>
        <p className="catalog-availability-note">{availabilityNotice}</p>
      </div>
      {state.status === 'loaded' && <div className="catalog-filters" role="search" aria-label="Filtros del catálogo">
        <p className="field-help">Los resultados se actualizan al cambiar los filtros.</p>
        <div className="catalog-filter-fields">
          <div className="form-field"><label htmlFor="catalog-search">Buscar por nombre o descripción</label>
            <input id="catalog-search" type="search" value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)} /></div>
          <div className="form-field"><label htmlFor="catalog-category">Tipo de espacio</label>
            <select id="catalog-category" value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
              <option value="">Todos los tipos</option>
              {Object.entries(spaceCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></div>
          <div className="form-field"><label htmlFor="catalog-commune">Comuna</label>
            <input id="catalog-commune" value={filters.commune} onChange={(event) => updateFilter('commune', event.target.value)} /></div>
          <div className="form-field"><label htmlFor="catalog-minimum-price">Precio mínimo por hora</label>
            <input id="catalog-minimum-price" inputMode="numeric" value={filters.minimumPrice}
              onChange={(event) => updateFilter('minimumPrice', event.target.value)} /></div>
          <div className="form-field"><label htmlFor="catalog-maximum-price">Precio máximo por hora</label>
            <input id="catalog-maximum-price" inputMode="numeric" value={filters.maximumPrice}
              onChange={(event) => updateFilter('maximumPrice', event.target.value)} /></div>
          <div className="form-field"><label htmlFor="catalog-capacity">Capacidad mínima</label>
            <input id="catalog-capacity" inputMode="numeric" value={filters.minimumCapacity}
              onChange={(event) => updateFilter('minimumCapacity', event.target.value)} /></div>
          <div className="form-field"><label htmlFor="catalog-sort">Ordenar por</label>
            <select id="catalog-sort" value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
              <option value="default">Orden del catálogo</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
            </select></div>
        </div>
        <button type="button" onClick={() => setFilters(emptyFilters)}>Limpiar filtros</button>
        {result.error && <p className="form-error" role="alert">{result.error}</p>}
      </div>}
      {state.status === 'loading' ? <div className="catalog-state"><p role="status">Cargando publicaciones…</p></div> :
        state.status === 'error' ? <div className="catalog-state"><p className="form-error" role="alert">No pudimos cargar el catálogo. Vuelve a intentarlo.</p>
          <button onClick={() => setAttempt((value) => value + 1)}>Volver a cargar catálogo</button></div> :
          result.error ? null : !state.spaces.length ? <div className="catalog-state"><p role="status">Todavía no hay publicaciones para mostrar.</p></div> :
            !result.spaces.length ? <div className="catalog-state"><p role="status">No hay publicaciones que coincidan con los filtros.</p></div> :
              <div className="catalog-grid">{result.spaces.map((space) => <PublicSpaceCard key={space.id} space={space} />)}</div>}
    </section>
  );
}
