#!/usr/bin/env python3
"""
StemSeparator - Motor local de separación de instrumentos
=====================================
Este script permite separar canciones en stems usando modelos de IA.

OPCIONES DISPONIBLES:
1. Spleeter (2, 4 o 5 stems) - Deezer
2. Demucs (4 stems) - Facebook
3. Open-Unmix (4 stems)

REQUISITOS:
    pip install spleeter==0.1.0 librosa soundfile numpy

NOTA: Esta herramienta NO sube archivos a Internet. Todo se procesa localmente.

USO:
    python separator.py input.mp3 ./output --stems 6 --model demucs

SALIDA:
    ./output/input/vocals.wav
    ./output/input/drums.wav
    ./output/input/bass.wav
    ./output/input/other.wav
    (más stems según modelo)
"""

import argparse
import os
import sys
import json
from pathlib import Path

def check_environment():
    """Verificar si Python y dependencias están disponibles"""
    result = {
        'python_version': sys.version,
        'dependencies': {}
    }

    # Verificar numpy
    try:
        import numpy
        result['dependencies']['numpy'] = True
    except ImportError:
        result['dependencies']['numpy'] = False

    # Verificar librosa
    try:
        import librosa
        result['dependencies']['librosa'] = True
    except ImportError:
        result['dependencies']['librosa'] = False

    # Verificar soundfile
    try:
        import soundfile
        result['dependencies']['soundfile'] = True
    except ImportError:
        result['dependencies']['soundfile'] = False

    # Verificar spleeter
    try:
        from spleeter.separator import Separator
        result['dependencies']['spleeter'] = True
    except ImportError:
        result['dependencies']['spleeter'] = False

    return result

def separate_with_spleeter(input_file, output_dir, stems=4):
    """Separar usando Spleeter"""
    try:
        from spleeter.separator import Separator

        print(f"Loading Spleeter model: {stems}stems")
        model_name = f"spleeter:{stems}stems"

        # Descargar modelo si no existe
        separator = Separator(model_name)

        print(f"Processing: {input_file}")
        separator.separate_to_file(input_file, output_dir)

        # Listar archivos generados
        generated = []
        for f in Path(output_dir).rglob('*.wav'):
            if f.stat().st_size > 1000:  # > 1KB
                generated.append(str(f))

        print(f"Generated {len(generated)} stems")
        return {
            'success': True,
            'files': generated,
            'model': model_name
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def main():
    parser = argparse.ArgumentParser(
        description='Separate audio into instrument stems',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('input_file', help='Input audio file (MP3/WAV)')
    parser.add_argument('output_dir', help='Output directory')
    parser.add_argument('--stems', type=int, default=4,
                        choices=[2, 4, 5],
                        help='Number of stems (default: 4)')
    parser.add_argument('--model', choices=['spleeter', 'demucs', 'openunmix'],
                        default='spleeter',
                        help='Model to use (default: spleeter)')
    parser.add_argument('--json', action='store_true',
                        help='Output as JSON')

    args = parser.parse_args()

    # Verificar archivo de entrada
    if not os.path.exists(args.input_file):
        result = {'success': False, 'error': 'Input file not found'}
        print(json.dumps(result) if args.json else f"Error: {result['error']}")
        return 1

    # Crear directorio de salida
    os.makedirs(args.output_dir, exist_ok=True)

    # Realizar separación
    if args.model == 'spleeter':
        result = separate_with_spleeter(args.input_file, args.output_dir, args.stems)
    else:
        result = {
            'success': False,
            'error': f'Model {args.model} not implemented yet'
        }

    # Salida
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if result['success']:
            print("Separation completed successfully")
            for f in result['files']:
                print(f"  {os.path.basename(f)}")
        else:
            print(f"Error: {result['error']}")

    return 0 if result['success'] else 1

if __name__ == '__main__':
    sys.exit(main())