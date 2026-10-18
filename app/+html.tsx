import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML for static web export (SDK 58+).
 * Must render headNodes/bodyNodes or JS bundles never load (stuck spinner).
 */
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="es" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>ONE KIDS — Tutor IA y aprendizaje</title>
        <meta
          name="description"
          content="ONE KIDS: tutor IA por foto de tareas, mundos educativos y control parental con modo enfoque."
        />
        <meta name="theme-color" content="#3DB8E8" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: baseCss }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

const baseCss = `
html, body, #root {
  height: 100%;
}
body {
  margin: 0;
  background-color: #0F2A3A;
  font-family: system-ui, -apple-system, sans-serif;
}
`;
