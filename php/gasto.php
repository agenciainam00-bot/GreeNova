<?php
/* GreeNova SC - cuánto lleva gastado el agente hoy.
   ===========================================================================
   El contador que escribe php/chat.php vive fuera de public_html, así que no se
   puede abrir por URL. Este archivo es la única ventana a ese dato, y viene
   apagado: solo responde si defines una clave en el archivo de secretos.

     /home/uXXXXXXX/greenova-secretos.php
     <?php return [
         'OPENAI_API_KEY' => 'sk-proj-...',
         'GASTO_TOKEN'    => 'una-palabra-larga-que-solo-tu-sepas',
     ];

   Luego lo consultas así:
     https://www.greenovasc.com.mx/php/gasto.php?token=una-palabra-larga...

   Sin GASTO_TOKEN definido responde 404, como si el archivo no existiera.
   =========================================================================== */

declare(strict_types=1);

/* Precios de referencia por millón de tokens, para traducir el consumo a
   dinero. NO son un dato del sistema: confírmalos en la página de precios de
   OpenAI y ajústalos aquí si cambian o si cambias de modelo. */
const PRECIO_ENTRADA = 0.15;
const PRECIO_SALIDA  = 0.60;

function secreto(string $nombre): string {
    $env = getenv($nombre);
    if (is_string($env) && $env !== '') return trim($env);

    $raiz = isset($_SERVER['DOCUMENT_ROOT']) ? dirname((string) $_SERVER['DOCUMENT_ROOT']) : '';
    if ($raiz !== '') {
        $archivo = $raiz . '/greenova-secretos.php';
        if (is_readable($archivo)) {
            $cfg = require $archivo;
            if (is_array($cfg) && !empty($cfg[$nombre])) return trim((string) $cfg[$nombre]);
        }
    }
    return '';
}

$esperado = secreto('GASTO_TOKEN');
$dado     = isset($_GET['token']) ? (string) $_GET['token'] : '';

/* hash_equals compara en tiempo constante: evita adivinar la clave midiendo
   cuánto tarda en responder. */
if ($esperado === '' || $dado === '' || !hash_equals($esperado, $dado)) {
    http_response_code(404);
    exit;
}

$raiz  = isset($_SERVER['DOCUMENT_ROOT']) ? dirname((string) $_SERVER['DOCUMENT_ROOT']) : '';
$ruta  = ($raiz !== '' && is_readable($raiz . '/greenova-gasto.json'))
    ? $raiz . '/greenova-gasto.json'
    : rtrim(sys_get_temp_dir(), '/') . '/greenova-gasto.json';

$d = is_readable($ruta) ? json_decode((string) file_get_contents($ruta), true) : null;
if (!is_array($d)) $d = ['fecha' => gmdate('Y-m-d'), 'preguntas' => 0, 'tokens_entrada' => 0, 'tokens_salida' => 0];

$entrada = (int) ($d['tokens_entrada'] ?? 0);
$salida  = (int) ($d['tokens_salida'] ?? 0);
$costo   = ($entrada / 1000000) * PRECIO_ENTRADA + ($salida / 1000000) * PRECIO_SALIDA;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode([
    'fecha'          => $d['fecha'] ?? gmdate('Y-m-d'),
    'preguntas'      => (int) ($d['preguntas'] ?? 0),
    'tope_diario'    => 300,
    'tokens_entrada' => $entrada,
    'tokens_salida'  => $salida,
    'costo_usd_aprox' => round($costo, 4),
    'nota'           => 'El costo es una estimación con los precios escritos en este archivo. La factura real está en el panel de OpenAI.',
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
