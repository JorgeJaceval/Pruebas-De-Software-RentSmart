import { test, expect, seedSpace, headersFor } from './fixtures';
import { detailValue, fillSpace, loginAs } from './ui';

test('E3-03: publicar por UI y consultar la publicación en catálogo y detalle', async ({ page, owner, spaceData }) => {
  await loginAs(page, owner);
  await page.getByRole('navigation', { name: 'Mi cuenta', exact: true })
    .getByRole('link', { name: 'Publicar espacio', exact: true }).click();
  const form = page.getByRole('form', { name: 'Publicar espacio' });
  await fillSpace(form, spaceData);
  await form.getByRole('button', { name: 'Publicar espacio', exact: true }).click();
  await expect(page.getByText('Tu espacio fue publicado.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: spaceData.name, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Explorar catálogo', exact: true }).click();
  await page.getByLabel('Buscar por nombre o descripción', { exact: true }).fill(spaceData.name);
  await page.getByRole('link', { name: `Ver espacio: ${spaceData.name}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: spaceData.name, exact: true })).toBeVisible();
  await expect(page.getByText(spaceData.description, { exact: true })).toBeVisible();
  await expect(detailValue(page, 'Capacidad')).toHaveText('8 personas');
});

test('E3-04: editar publicación propia conserva los cambios al recargar', async ({ page, owner, space }) => {
  await loginAs(page, owner);
  await page.getByRole('article', { name: space.name, exact: true })
    .getByRole('link', { name: 'Editar espacio', exact: true }).click();
  const form = page.getByRole('form', { name: 'Editar espacio' });
  const name = `${space.name} editada`;
  await form.getByLabel('Nombre del espacio', { exact: true }).fill(name);
  await form.getByLabel('Precio por hora (CLP)', { exact: true }).fill('12500');
  await form.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByText('Los cambios fueron guardados.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(detailValue(page, 'Precio por hora')).toContainText('12.500');
});

test('E3-05: eliminar publicación sin reservas la quita del panel y catálogo', async ({ page, request, owner, space }) => {
  await loginAs(page, owner);
  const card = page.getByRole('article', { name: space.name, exact: true });
  await card.getByRole('button', { name: 'Eliminar espacio', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: `Eliminar «${space.name}»`, exact: true });
  await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
  await expect(page.getByText('Tu espacio fue eliminado.', { exact: true })).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Todavía no tienes espacios publicados.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Explorar catálogo', exact: true }).click();
  await page.getByLabel('Buscar por nombre o descripción', { exact: true }).fill(space.name);
  await expect(page.getByRole('article', { name: space.name, exact: true })).toHaveCount(0);
  await expect(page.getByText(/No hay publicaciones que coincidan|Todavía no hay publicaciones para mostrar/)).toBeVisible();
  expect((await request.get(`/api/spaces/public/${space.id}`)).status()).toBe(404);
});

test('E3-06: formulario obligatorio y precio bajo el mínimo no crean publicaciones', async ({ page, request, owner, spaceData }) => {
  await loginAs(page, owner);
  await page.getByRole('navigation', { name: 'Mi cuenta', exact: true })
    .getByRole('link', { name: 'Publicar espacio', exact: true }).click();
  const form = page.getByRole('form', { name: 'Publicar espacio' });
  await form.getByRole('button', { name: 'Publicar espacio', exact: true }).click();
  await expect(form.getByLabel('Nombre del espacio', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByText('El nombre debe tener entre 5 y 80 caracteres.', { exact: true })).toBeVisible();
  await fillSpace(form, { ...spaceData, price_per_hour: 499 });
  await form.getByRole('button', { name: 'Publicar espacio', exact: true }).click();
  await expect(form.getByLabel('Precio por hora (CLP)', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByText('El precio debe ser un número entero entre 500 y 500.000 CLP.', { exact: true })).toBeVisible();
  const response = await request.get('/api/spaces/mine', { headers: headersFor(owner) });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});

test('E3-07: búsqueda combinada, orden de precio y limpieza mantienen resultados coherentes', async ({ page, request, owner, spaceData }) => {
  const group = spaceData.commune;
  const a = await seedSpace(request, owner, { ...spaceData, name: `${group} A` });
  const b = await seedSpace(request, owner, { ...spaceData, name: `${group} B`, category: 'photo_studio',
    capacity: 4, price_per_hour: 5000 });
  const c = await seedSpace(request, owner, { ...spaceData, name: `${group} C`, capacity: 12, price_per_hour: 20000 });
  await page.goto('/#catalogo');
  const search = page.getByRole('search', { name: 'Filtros del catálogo' });
  await search.getByLabel('Buscar por nombre o descripción', { exact: true }).fill(group.toUpperCase());
  await search.getByLabel('Ordenar por', { exact: true }).selectOption('price-asc');
  await expect(page.getByRole('article').getByRole('heading')).toHaveText([b.name, a.name, c.name]);
  await search.getByLabel('Tipo de espacio', { exact: true }).selectOption('meeting_room');
  await search.getByLabel('Comuna', { exact: true }).fill(group);
  await search.getByLabel('Precio máximo por hora', { exact: true }).fill('15000');
  await search.getByLabel('Capacidad mínima', { exact: true }).fill('5');
  await expect(page.getByRole('article').getByRole('heading')).toHaveText([a.name]);
  await search.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await expect(search.getByLabel('Buscar por nombre o descripción', { exact: true })).toHaveValue('');
  await expect(search.getByLabel('Tipo de espacio', { exact: true })).toHaveValue('');
  await expect(search.getByLabel('Ordenar por', { exact: true })).toHaveValue('default');
  for (const space of [a, b, c]) await expect(page.getByRole('article', { name: space.name, exact: true })).toBeVisible();
});
