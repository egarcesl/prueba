const form = document.getElementById('foundation-form');
const metricsContainer = document.getElementById('metrics');
const messagesContainer = document.getElementById('messages');
const statusBadge = document.getElementById('statusBadge');
const canvas = document.getElementById('pressureCanvas');
const ctx = canvas.getContext('2d');

const format = (value, unit, digits = 2) => `${value.toFixed(digits)} ${unit}`;

function parseField(id) {
  return Number(document.getElementById(id).value);
}

function calculateFoundation(values) {
  const totalLoad = values.axialLoad + values.selfWeight;
  const area = values.widthX * values.lengthY;
  const averagePressure = totalLoad / area;
  const ex = values.momentY / totalLoad;
  const ey = values.momentX / totalLoad;

  const corners = [
    { sx: 1, sy: 1, label: 'q₁' },
    { sx: -1, sy: 1, label: 'q₂' },
    { sx: 1, sy: -1, label: 'q₃' },
    { sx: -1, sy: -1, label: 'q₄' }
  ].map((corner) => {
    const factor = 1 + corner.sx * (6 * ex / values.widthX) + corner.sy * (6 * ey / values.lengthY);
    return { ...corner, value: averagePressure * factor };
  });

  const pressures = corners.map((corner) => corner.value);
  const qmax = Math.max(...pressures);
  const qmin = Math.min(...pressures);
  const withinCore = Math.abs(ex) <= values.widthX / 6 && Math.abs(ey) <= values.lengthY / 6;
  const allowableWithFactor = values.allowablePressure / values.safetyFactor;
  const utilization = qmax / allowableWithFactor;
  const requiredArea = totalLoad / allowableWithFactor;
  const equivalentSquare = Math.sqrt(requiredArea);

  return {
    totalLoad,
    area,
    averagePressure,
    ex,
    ey,
    qmax,
    qmin,
    withinCore,
    allowableWithFactor,
    utilization,
    requiredArea,
    equivalentSquare,
    corners
  };
}

function metric(label, value) {
  return `<article class="metric"><small>${label}</small><strong>${value}</strong></article>`;
}

function updateBadge(result) {
  statusBadge.className = 'badge';

  if (result.qmin < 0) {
    statusBadge.classList.add('danger');
    statusBadge.textContent = 'Posible levantamiento';
    return;
  }

  if (result.qmax > result.allowableWithFactor || !result.withinCore) {
    statusBadge.classList.add('warning');
    statusBadge.textContent = 'Requiere ajuste';
    return;
  }

  statusBadge.classList.add('success');
  statusBadge.textContent = 'Cumple preliminarmente';
}

function updateMessages(result, values) {
  const messages = [];

  messages.push(
    `La carga total considerada es ${format(result.totalLoad, 'kN')} sobre un área de ${format(result.area, 'm²')}.`
  );
  messages.push(
    `Las excentricidades resultan ex = ${format(result.ex, 'm')} y ey = ${format(result.ey, 'm')}.`
  );
  messages.push(
    result.withinCore
      ? 'La resultante cae dentro del núcleo central de la zapata.'
      : 'La resultante sale del núcleo central; conviene aumentar dimensiones o redistribuir acciones.'
  );
  messages.push(
    result.qmin < 0
      ? 'La presión mínima es negativa, lo que sugiere pérdida parcial de contacto con el suelo.'
      : 'Todas las presiones son compresivas en las cuatro esquinas analizadas.'
  );
  messages.push(
    result.qmax <= result.allowableWithFactor
      ? `La presión máxima está por debajo de la admisible de diseño (${format(result.allowableWithFactor, 'kPa')}).`
      : `La presión máxima supera la admisible de diseño (${format(result.allowableWithFactor, 'kPa')}); se requiere rediseño.`
  );

  if (result.requiredArea > result.area) {
    messages.push(
      `Como guía rápida, el área mínima por capacidad admisible es ${format(result.requiredArea, 'm²')}, equivalente a una zapata cuadrada de ${format(result.equivalentSquare, 'm')} por lado.`
    );
  } else {
    messages.push(
      `El área actual (${format(result.area, 'm²')}) supera el mínimo estimado por capacidad admisible (${format(result.requiredArea, 'm²')}).`
    );
  }

  if (values.selfWeight === 0) {
    messages.push('No se agregó peso propio ni relleno; si corresponde, inclúyelo para una evaluación más realista en servicio.');
  }

  messagesContainer.innerHTML = messages.map((message) => `<li>${message}</li>`).join('');
}

function renderMetrics(result) {
  metricsContainer.innerHTML = [
    metric('Presión media', format(result.averagePressure, 'kPa')),
    metric('Presión máxima', format(result.qmax, 'kPa')),
    metric('Presión mínima', format(result.qmin, 'kPa')),
    metric('ex', format(result.ex, 'm')),
    metric('ey', format(result.ey, 'm')),
    metric('Utilización', `${(result.utilization * 100).toFixed(1)} %`),
    metric('Área requerida', format(result.requiredArea, 'm²')),
    metric('Lado equivalente', format(result.equivalentSquare, 'm'))
  ].join('');
}

function pressureColor(normalized) {
  const hue = 210 - normalized * 210;
  return `hsl(${hue}, 80%, ${58 - normalized * 15}%)`;
}

function drawPressureMap(result, values) {
  const size = canvas.width;
  const padding = 36;
  const mapSize = size - padding * 2;
  const steps = 30;

  const pressureAt = (xSign, ySign) => {
    const factor = 1 + xSign * (6 * result.ex / values.widthX) + ySign * (6 * result.ey / values.lengthY);
    return result.averagePressure * factor;
  };

  const sampleValues = [];
  for (let row = 0; row < steps; row += 1) {
    for (let col = 0; col < steps; col += 1) {
      const xSign = -1 + (2 * col) / (steps - 1);
      const ySign = 1 - (2 * row) / (steps - 1);
      sampleValues.push(pressureAt(xSign, ySign));
    }
  }

  const min = Math.min(...sampleValues);
  const max = Math.max(...sampleValues);
  ctx.clearRect(0, 0, size, size);

  for (let row = 0; row < steps; row += 1) {
    for (let col = 0; col < steps; col += 1) {
      const xSign = -1 + (2 * col) / (steps - 1);
      const ySign = 1 - (2 * row) / (steps - 1);
      const pressure = pressureAt(xSign, ySign);
      const normalized = max === min ? 0.5 : (pressure - min) / (max - min);
      ctx.fillStyle = pressureColor(normalized);
      ctx.fillRect(
        padding + (mapSize * col) / steps,
        padding + (mapSize * row) / steps,
        mapSize / steps + 1,
        mapSize / steps + 1
      );
    }
  }

  ctx.strokeStyle = '#16324f';
  ctx.lineWidth = 3;
  ctx.strokeRect(padding, padding, mapSize, mapSize);

  ctx.fillStyle = '#16324f';
  ctx.font = '16px sans-serif';
  ctx.fillText('+Y', size / 2 - 12, 24);
  ctx.fillText('+X', size - 42, size / 2);
  ctx.fillText('-X', 8, size / 2);
  ctx.fillText('-Y', size / 2 - 12, size - 10);

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding + mapSize / 3, padding + mapSize / 3, mapSize / 3, mapSize / 3);

  const centerX = padding + mapSize * (0.5 + result.ex / values.widthX);
  const centerY = padding + mapSize * (0.5 - result.ey / values.lengthY);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0b2942';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#16324f';
  ctx.font = '14px sans-serif';
  ctx.fillText('Resultante', Math.min(centerX + 12, size - 110), Math.max(centerY - 12, 28));
}

function handleSubmit(event) {
  event.preventDefault();

  const values = {
    axialLoad: parseField('axialLoad'),
    momentX: parseField('momentX'),
    momentY: parseField('momentY'),
    widthX: parseField('widthX'),
    lengthY: parseField('lengthY'),
    allowablePressure: parseField('allowablePressure'),
    selfWeight: parseField('selfWeight'),
    safetyFactor: parseField('safetyFactor')
  };

  const invalid = Object.values(values).some((value) => Number.isNaN(value))
    || values.axialLoad <= 0
    || values.widthX <= 0
    || values.lengthY <= 0
    || values.allowablePressure <= 0
    || values.safetyFactor <= 0;
  if (invalid) {
    statusBadge.className = 'badge danger';
    statusBadge.textContent = 'Entradas inválidas';
    messagesContainer.innerHTML = '<li>Revisa que todas las entradas sean numéricas y mayores que cero donde corresponda.</li>';
    return;
  }

  const result = calculateFoundation(values);
  canvas.dataset.widthX = values.widthX;
  canvas.dataset.lengthY = values.lengthY;
  renderMetrics(result);
  updateBadge(result);
  updateMessages(result, values);
  drawPressureMap(result, values);
}

form.addEventListener('submit', handleSubmit);
handleSubmit(new Event('submit'));
