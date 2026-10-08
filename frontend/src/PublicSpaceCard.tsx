import SpacePhoto from './SpacePhoto';
import { spaceCategories } from './spaces';
import { type PublicSpace } from './publicSpaces';

export default function PublicSpaceCard({ space, linked = true }: { space: PublicSpace; linked?: boolean }) {
  const titleId = `public-space-${space.id}`;
  const price = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(space.price_per_hour);
  return (
    <article className="catalog-card" aria-labelledby={titleId}>
      <SpacePhoto key={space.photos[0]} url={space.photos[0]} label={`Foto de ${space.name}`} />
      <div className="catalog-card-copy">
        <p className="catalog-card-category">{spaceCategories[space.category]} · {space.commune}</p>
        {linked ? <h2 id={titleId}>{space.name}</h2> : <h1 id={titleId}>{space.name}</h1>}
        <dl className="catalog-card-details">
          <div><dt>Capacidad</dt><dd>{space.capacity} personas</dd></div>
          <div><dt>Precio por hora</dt><dd>{price} CLP/h</dd></div>
        </dl>
        {linked && <a className="registration-link" href={`#detalle-espacio/${space.id}`} aria-label={`Ver espacio: ${space.name}`}>Ver espacio</a>}
      </div>
    </article>
  );
}
