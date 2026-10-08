/** Ritaglio quadrato centrato e ridimensionamento a `size` px (JPEG). */
export async function cropSquare(file: File, size = 512): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas
    .getContext('2d')!
    .drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Ritaglio fallito'))), 'image/jpeg', 0.88),
  );
}
