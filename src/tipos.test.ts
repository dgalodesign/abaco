import { describe, expect, it } from 'vitest';
import { Perfil, alquilerAnual, añoNacimiento } from './tipos.js';

describe('Perfil', () => {
  it('solo asalariado: basta con el tipo y el año de nacimiento', () => {
    const p = Perfil.parse({ tipo: 'asalariado', personal: { añoNacimiento: 1995, alquilerMensual: 450 } });
    expect(p.nombre).toBeUndefined();
    expect(añoNacimiento(p.personal!)).toBe(1995);
    expect(alquilerAnual(p.personal!)).toBe(5_400);
    expect(p.personal!.circunstanciasFamiliares).toBe(false);
  });
  it('sigue aceptando perfiles antiguos (nombre, NIF, fecha de nacimiento, alquiler anual, planes)', () => {
    const p = Perfil.parse({
      nombre: 'Ana Prueba',
      nif: '00000000T',
      cuotaReta: 300,
      suministros: { afectacion: 0.1 },
      personal: { fechaNacimiento: '1990-06-15', alquilerAnual: 4_125, planes: ['coche'] },
    });
    expect(añoNacimiento(p.personal!)).toBe(1990);
    expect(alquilerAnual(p.personal!)).toBe(4_125);
    expect(p.personal!.planes).toEqual(['coche']);
  });
  it('pide el año de nacimiento si hay datos para la Renta', () => {
    expect(Perfil.safeParse({ tipo: 'asalariado', personal: {} }).success).toBe(false);
  });
  it('un autónomo sigue necesitando RETA y suministros', () => {
    expect(Perfil.safeParse({ tipo: 'autonomo' }).success).toBe(false);
  });
});
