import { useEffect, useRef, useState, type FormEvent } from 'react';
import SpacePhoto from './SpacePhoto';
import { emptySpaceFields, spaceCategories, SpaceError, validateSpace, validPhotoUrl,
  type Space, type SpaceErrors, type SpaceFields } from './spaces';

type Props = {
  initialFields?: SpaceFields;
  submit: (fields: SpaceFields) => Promise<Space | undefined>;
  onSuccess: (space: Space) => void;
};

export default function SpaceForm({ initialFields = emptySpaceFields, submit, onSuccess }: Props) {
  const [fields, setFields] = useState<SpaceFields>(() => ({ ...initialFields, photos: [...initialFields.photos] }));
  const [errors, setErrors] = useState<SpaceErrors>({});
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function updateField(key: keyof SpaceFields, value: string | string[]) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined, form: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const validation = validateSpace(fields);
    setErrors(validation);
    if (Object.keys(validation).length) {
      const key = Object.keys(validation)[0];
      const input = event.currentTarget.elements.namedItem(key === 'photos' ? 'photo-0' : key);
      if (input instanceof HTMLElement) input.focus();
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      const created = await submit(fields);
      if (mounted.current && created) onSuccess(created);
    } catch (error) {
      if (mounted.current) setErrors(error instanceof SpaceError ? error.errors : {
        form: 'No pudimos publicar tu espacio. Tus datos se conservaron; vuelve a intentarlo.',
      });
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  function attributes(key: Exclude<keyof SpaceFields, 'photos'>) {
    return { id: `space-${key}`, name: key, value: fields[key], required: true,
      onChange: (event: { target: { value: string } }) => updateField(key, event.target.value),
      'aria-invalid': Boolean(errors[key]),
      'aria-describedby': `space-${key}-help${errors[key] ? ` space-${key}-error` : ''}` };
  }

  function help(key: keyof SpaceFields, message: string) {
    return <>
      <p id={`space-${key}-help`} className="field-help">{message}</p>
      {errors[key] && <p id={`space-${key}-error`} className="field-error">{errors[key]}</p>}
    </>;
  }

  return (
    <section className="space-editor" aria-labelledby="publish-space-title">
      <div className="space-editor-heading">
        <div><p className="eyebrow">DALE VIDA A TU ESPACIO</p><h1 id="publish-space-title">Publica tu espacio</h1>
          <p>Cuéntanos cómo es tu lugar y las condiciones para compartirlo.</p></div>
        <a className="registration-link" href="#mis-espacios">Volver a mis espacios</a>
      </div>
      <div className="registration-card space-form-card">
        <p className="space-required-note">Todos los datos son obligatorios. Puedes agregar hasta tres fotos.</p>
        <form onSubmit={onSubmit} noValidate aria-label="Publicar espacio" aria-busy={pending}>
          <fieldset disabled={pending}>
            <div className="space-fields-grid">
              <div className="form-field full-width"><label htmlFor="space-name">Nombre del espacio</label>
                <input {...attributes('name')} />{help('name', 'Entre 5 y 80 caracteres.')}</div>
              <div className="form-field full-width"><label htmlFor="space-description">Descripción</label>
                <textarea {...attributes('description')} rows={4} />{help('description', 'Entre 20 y 1.000 caracteres. Describe lo que ofrece tu espacio.')}</div>
              <div className="form-field"><label htmlFor="space-category">Tipo de espacio</label>
                <select {...attributes('category')}><option value="">Selecciona una categoría</option>
                  {Object.entries(spaceCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>{help('category', 'Elige la categoría que mejor describe tu lugar.')}</div>
              <div className="form-field"><label htmlFor="space-commune">Comuna</label>
                <input {...attributes('commune')} />{help('commune', 'Entre 2 y 80 caracteres.')}</div>
              <div className="form-field full-width"><label htmlFor="space-location_reference">Ubicación referencial</label>
                <input {...attributes('location_reference')} />{help('location_reference', 'Entre 5 y 150 caracteres. Por ejemplo, cerca de una estación de metro.')}</div>
              <div className="form-field"><label htmlFor="space-capacity">Capacidad (personas)</label>
                <input {...attributes('capacity')} type="number" min="1" max="100" step="1" />{help('capacity', 'De 1 a 100 personas, sin decimales.')}</div>
              <div className="form-field"><label htmlFor="space-price_per_hour">Precio por hora (CLP)</label>
                <input {...attributes('price_per_hour')} type="number" min="500" max="500000" step="1" />{help('price_per_hour', 'Entre 500 y 500.000 pesos, sin decimales.')}</div>
              <div className="form-field full-width"><label htmlFor="space-conditions">Condiciones de uso</label>
                <textarea {...attributes('conditions')} rows={3} />{help('conditions', 'Entre 10 y 500 caracteres. Indica reglas y cuidados del espacio.')}</div>
            </div>
            <fieldset className="space-field-group"><legend>Horario diario</legend><p className="field-help">Hora de Santiago. Puedes cambiar el horario inicial de 09:00 a 18:00.</p>
              <div className="space-fields-grid">
                <div className="form-field"><label htmlFor="space-opening_hour">Hora de apertura</label>
                  <select {...attributes('opening_hour')}>{Array.from({ length: 23 }, (_, hour) =>
                    <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select>
                  {help('opening_hour', 'Horas completas desde las 00:00.')}</div>
                <div className="form-field"><label htmlFor="space-closing_hour">Hora de cierre</label>
                  <select {...attributes('closing_hour')}>{Array.from({ length: 23 }, (_, index) => index + 1).map((hour) =>
                    <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select>
                  {help('closing_hour', 'Posterior a la apertura, hasta las 23:00.')}</div>
              </div>
            </fieldset>
            <fieldset className="space-field-group" aria-describedby={`space-photos-help${errors.photos ? ' space-photos-error' : ''}`}>
              <legend>Fotos del espacio</legend>
              <p id="space-photos-help" className="field-help">Agrega entre 1 y 3 enlaces HTTPS. La primera foto será la portada.</p>
              <div className="photo-inputs">
                {fields.photos.map((url, index) => <div key={index} className="photo-input-row">
                  <div className="form-field"><label htmlFor={`space-photo-${index}`}>Foto {index + 1} (URL HTTPS){index > 0 && ' · opcional'}</label>
                    <input id={`space-photo-${index}`} name={`photo-${index}`} type="url" value={url}
                      onChange={(event) => updateField('photos', fields.photos.map((previous, position) =>
                        position === index ? event.target.value : previous))}
                      aria-invalid={Boolean(errors.photos)} aria-describedby={errors.photos ? 'space-photos-error' : 'space-photos-help'} />
                  </div>
                  {validPhotoUrl(url) && <SpacePhoto key={url.trim()} url={url.trim()} label={`Vista previa de foto ${index + 1}`} />}
                </div>)}
              </div>
              {errors.photos && <p id="space-photos-error" className="field-error">{errors.photos}</p>}
            </fieldset>
            {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
            <button className="registration-submit" type="submit">{pending ? 'Publicando tu espacio…' : 'Publicar espacio'}</button>
          </fieldset>
          <p className="registration-feedback" role="status" aria-live="polite">{pending ? 'Estamos publicando tu espacio.' :
            Object.values(errors).some(Boolean) ? 'No se pudo completar la publicación. Revisa los mensajes del formulario.' : ''}</p>
        </form>
      </div>
    </section>
  );
}
