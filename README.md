# Calculadora de fundaciones con carga biaxial

Aplicación web estática para evaluar en forma preliminar una zapata rectangular sometida a carga axial y momentos biaxiales.

## Qué calcula

- Carga total incluyendo peso propio opcional.
- Área de la fundación.
- Excentricidades `ex` y `ey`.
- Presión media, máxima y mínima de contacto.
- Verificación del núcleo central.
- Utilización respecto de la presión admisible.
- Área mínima orientativa por capacidad admisible.

## Uso

1. Abre `index.html` en un navegador.
2. Ingresa la carga axial, momentos, dimensiones y presión admisible del suelo.
3. Haz clic en **Calcular** para ver resultados y el mapa relativo de presiones.

## Modelo simplificado

La app usa una distribución lineal de presiones para una zapata rígida rectangular:

`q = P/A · (1 ± 6ex/B ± 6ey/L)`

Este resultado es solo preliminar y debe verificarse con el criterio estructural y geotécnico del proyecto.
