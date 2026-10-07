import { useEffect, useRef, useState, type FormEvent } from 'react';
import SpacePhoto from './SpacePhoto';
import { emptySpaceFields, spaceCategories, SpaceError, validateSpace, validPhotoUrl,
  type Space, type SpaceErrors, type SpaceFields } from './spaces';

type Props = {
  mode?: 'publish' | 'edit';
  inactive?: boolean;
  initialFields?: SpaceFields;
  submit: (fields: SpaceFields) => Promise<Space | undefined>;
  onSuccess: (space: Space) => void;
  onCancel?: () => void;
};

export default function SpaceForm({ mode = 'publish', inactive = false, initialFields = emptySpaceFields, submit, onSuccess, onCancel }: Props) {
  const editing = mode === 'edit';
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
        form: editing ? 'No pudimos guardar los cambios. Tus datos se conservaron; vuelve a intentarlo.' :
          'No pudimos publicar tu espacio. Tus datos se conservaron; vuelve a intentarlo.',
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
        <div><p className="eyebrow">{editing ? 'ACTUALIZA TU PUBLICACIÓN' : 'DALE VIDA A TU ESPACIO'}</p>
          <h1 id="publish-space-title">{editing ? 'Edita tu espacio' : 'Publica tu espacio'}</h1>
          <p>{editing ? 'Revisa sus características y guarda los cambios cuando estén listos.' :
            'Cuéntanos cómo es tu lugar y las condiciones para compartirlo.'}</p></div>
        {!editing && <a className="registration-link" href="#mis-espacios">Volver a mis espacios</a>}
      </div>
      <div className="registration-card space-form-card">
        <p className="space-required-note">Todos los datos son obligatorios. Puedes agregar hasta tres fotos.</p>
        {editing && inactive && <p className="session-message" role="status">Esta publicación está inactiva. Guardar los cambios conserva su estado.</p>}
        <form onSubmit={onSubmit} noValidate aria-label={editing ? 'Editar espacio' : 'Publicar espacio'} aria-busy={pending}>
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
            <fieldset className="space-field-group"><legend>Horario diario</legend>
              <p className="field-help">{editing ? 'Hora de Santiago. El cierre debe ser posterior a la apertura.' :
                'Hora de Santiago. Puedes cambiar el horario inicial de 09:00 a 18:00.'}</p>
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
            <div className="space-form-actions">
              {editing && <button className="cancel-button" type="button" onClick={onCancel}>Cancelar</button>}
              <button className="registration-submit" type="submit">{editing ?
                pending ? 'Guardando cambios…' : 'Guardar cambios' : pending ? 'Publicando tu espacio…' : 'Publicar espacio'}</button>
            </div>
          </fieldset>
          <p className="registration-feedback" role="status" aria-live="polite">{pending ?
            editing ? 'Estamos guardando tus cambios.' : 'Estamos publicando tu espacio.' :
            Object.values(errors).some(Boolean) ? editing ? 'No se pudieron guardar los cambios. Revisa los mensajes del formulario.' :
              'No se pudo completar la publicación. Revisa los mensajes del formulario.' : ''}</p>
        </form>
      </div>
    </section>
  );
}
