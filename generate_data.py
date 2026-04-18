"""Genera 500 negocios ficticios para la demo. Determinístico (seed fija)."""
import json
import random
from pathlib import Path

random.seed(42)

ZONES = [
    {"name": "Avellaneda Centro",       "lat": -34.6614, "lng": -58.3650, "radius": 0.008},
    {"name": "Calle Iberlucea",         "lat": -34.6630, "lng": -58.3680, "radius": 0.005},
    {"name": "Lanus Centro",            "lat": -34.7050, "lng": -58.3920, "radius": 0.009},
    {"name": "Peatonal 9 de Julio",     "lat": -34.7060, "lng": -58.3930, "radius": 0.004},
    {"name": "Wilde Centro",            "lat": -34.7050, "lng": -58.3160, "radius": 0.008},
    {"name": "Av. Las Flores",          "lat": -34.7020, "lng": -58.3200, "radius": 0.006},
    {"name": "Calle Fabian Onsari",     "lat": -34.7080, "lng": -58.3140, "radius": 0.005},
    {"name": "Sarandi",                 "lat": -34.6850, "lng": -58.3420, "radius": 0.008},
]

RUBROS = {
    "panaderia":         ["Panaderia", "La Esquina", "Don", "Santa", "El Molino", "La Flor", "San Jose", "La Espiga", "La Nueva", "Tradicion"],
    "peluqueria":        ["Peluqueria", "Look", "Estilo", "Glam", "Magic", "Ale", "Vero", "Cabello y Co.", "Salon", "Belleza"],
    "kiosco":            ["Kiosco", "Kiosquito", "24hs", "Rapido", "El Amigo", "La Esquina", "Express", "Mini"],
    "ferreteria":        ["Ferreteria", "El Tornillo", "La Llave", "Herramientas", "Don Pedro", "Ferre", "Materiales"],
    "carniceria":        ["Carniceria", "El Buen Corte", "La Parrilla", "Don Tito", "La Vaca", "Angus", "El Novillo"],
    "verduleria":        ["Verduleria", "Frutas y Verduras", "La Huerta", "El Campo", "Frutera", "Verdura Fresca"],
    "restaurante":       ["Resto", "Parrilla", "Bodegon", "Cantina", "Trattoria", "La Mesa", "Sabor"],
    "cafeteria":         ["Cafe", "Cafeteria", "Coffee", "La Taza", "Mocca", "Espresso", "Havana"],
    "libreria":          ["Libreria", "El Lapiz", "Papeleria", "Escolar", "Utiles y Mas"],
    "farmacia":          ["Farmacia", "Salud", "Farmacity local", "La Farmacia del barrio"],
    "lavanderia":        ["Lavanderia", "Clean", "Espuma", "Burbuja"],
    "taller_mecanico":   ["Taller", "Mecanica", "AutoFix", "El Mecanico", "Gomeria"],
    "inmobiliaria":      ["Inmobiliaria", "Propiedades", "Hogar", "Casa y Ciudad"],
    "estetica":          ["Estetica", "Spa", "Belleza Integral", "Cara y Cuerpo"],
    "gimnasio":          ["Gym", "Gimnasio", "Fit", "Power House"],
    "tienda_ropa":       ["Boutique", "Moda", "Outlet", "La Tienda", "Indumentaria"],
    "zapateria":         ["Zapateria", "Calzados", "El Pie", "Step"],
    "jugueteria":        ["Jugueteria", "Mundo Juguete", "Arco Iris"],
    "pet_shop":          ["Pet Shop", "Mundo Animal", "Mascotas", "Can y Gato"],
    "optica":            ["Optica", "Vision", "Anteojos del Centro"],
}

APELLIDOS = ["Gonzalez", "Rodriguez", "Fernandez", "Lopez", "Martinez", "Perez", "Sanchez",
             "Romero", "Diaz", "Torres", "Alvarez", "Gomez", "Ruiz", "Benitez", "Silva"]

CALLES = ["Av. Mitre", "Av. Belgrano", "Av. Hipolito Yrigoyen", "Av. Pavon", "Av. Las Flores",
         "Calle 9 de Julio", "Iberlucea", "Alsina", "Colon", "Rivadavia", "San Martin",
         "Fabian Onsari", "Las Heras", "Sarmiento", "Moreno", "Alvear", "Pueyrredon",
         "Av. Presidente Peron", "25 de Mayo", "Mariano Acosta"]


def make_phone(rng):
    # 11-4xxx-xxxx or 11-5xxx-xxxx o celular 11-15xxxx-xxxx
    prefix = rng.choice(["11-4", "11-5", "11-6", "11-2", "11-3"])
    return f"{prefix}{rng.randint(100,999)}-{rng.randint(1000,9999)}"


def random_point_in_zone(zone, rng):
    # jitter uniforme en un cuadrado alrededor del centro, radio en grados
    r = zone["radius"]
    lat = zone["lat"] + rng.uniform(-r, r)
    lng = zone["lng"] + rng.uniform(-r, r)
    return lat, lng


def make_name(rubro_key, rng):
    pool = RUBROS[rubro_key]
    base = rng.choice(pool)
    variant = rng.randint(0, 5)
    if variant == 0:
        return f"{base} {rng.choice(APELLIDOS)}"
    if variant == 1:
        return f"{base} {rng.randint(2, 99)}"
    if variant == 2:
        return f"{base} del Centro"
    if variant == 3:
        return f"{base} {rng.choice(['Premium','Express','Plus','Total'])}"
    return base


def make_address(rng):
    return f"{rng.choice(CALLES)} {rng.randint(100, 4500)}"


def generate():
    rng = random.Random(42)
    prospects = []
    # distribucion por zona: ~aprox uniforme pero con pesos
    weights = [1.5, 0.8, 1.6, 0.7, 1.3, 0.9, 0.7, 1.0]
    zones_expanded = []
    for z, w in zip(ZONES, weights):
        zones_expanded.extend([z] * int(w * 10))

    rubro_keys = list(RUBROS.keys())
    for i in range(500):
        zone = rng.choice(zones_expanded)
        rubro = rng.choice(rubro_keys)
        lat, lng = random_point_in_zone(zone, rng)
        name = make_name(rubro, rng)
        prospects.append({
            "place_id": f"demo_{i:04d}",
            "name": name,
            "type": rubro,
            "address": make_address(rng) + f", {zone['name'].split(' ')[0]}",
            "phone": make_phone(rng),
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "zones": [zone["name"]],
            "google_maps": f"https://www.google.com/maps/search/?api=1&query={lat},{lng}",
        })

    out = Path(__file__).parent / "data.json"
    out.write_text(json.dumps(prospects, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"Generados {len(prospects)} prospectos en {out}")


if __name__ == "__main__":
    generate()
