/**
 * 🦕 Dino Evolution - Fähigkeiten-System
 * 
 * Zentrale Konfiguration und Berechnung der Dinosaurier-Fähigkeiten.
 * Verwendet sowohl im Generator als auch im Level-System.
 */

// ===================================
// EIGENSCHAFTEN-KONFIGURATION
// ===================================

const PROPERTY_CONFIG = {
    "🎨 Haut/Panzerung": {
        gepanzert: { cost: 1, name: "Gepanzert" },
        stachelig: { cost: 1, name: "Stachelig" },
        farbig: { cost: 1, name: "Farbig" },
        tarnung: { cost: 3, name: "Tarnung" }
    },
    "🦕 Kopf": {
        kopf_beisskraft: { cost: 1, name: "Beißkraft" },
        kopf_größe: { cost: 1, name: "Größe" },
        kopf_hörner_anzahl: { cost: 2, name: "Hörner (Anzahl)" },
        kopf_hörner_größe: { cost: 2, name: "Hörner (Größe)" },
        kragen_größe: { cost: 1, name: "Kragen" }
    },
    "🦷 Maul/Zähne": {
        maul_zahntyp: { cost: 2, name: "Zahntyp" }
    },
    "🐍 Hals": {
        hals_länge: { cost: 1, name: "Länge" },
        hals_breite: { cost: 1, name: "Breite" }
    },
    "🦴 Körper": {
        körper_länge: { cost: 1, name: "Länge" },
        körper_höhe: { cost: 1, name: "Höhe/Breite" }
    },
    "🦾 Vorderbeine": {
        vorderbeine_länge: { cost: 1, name: "Länge" },
        vorderbeine_stärke: { cost: 1, name: "Stärke" },
        vorderklauen_länge: { cost: 2, name: "Klauen" }
    },
    "🦵 Hinterbeine": {
        hinterbeine_länge: { cost: 1, name: "Länge" },
        hinterbeine_stärke: { cost: 1, name: "Stärke" },
        hinterklauen_länge: { cost: 2, name: "Klauen" }
    },
    "🐲 Schwanz": {
        schwanz_länge: { cost: 1, name: "Länge" },
        schwanz_breite: { cost: 1, name: "Breite" },
        schwanz_keule: { cost: 3, name: "Keule" },
        schwanz_stacheln: { cost: 2, name: "Stacheln" }
    },
    "🦅 Spezial": {
        flügel: { cost: 3, name: "Flügel" },
        flossen: { cost: 2, name: "Flossen" }
    },
    "🍖 Nahrung": {
        fleisch: { cost: 1, name: "Fleisch" },
        pflanzen: { cost: 1, name: "Pflanzen" },
        aas: { cost: 2, name: "Aas" }
    }
};

// ===================================
// FÄHIGKEITS-EINFLUSS-MATRIX
// ===================================

const DINO_ABILITIES_CONFIG = {
    "gepanzert": {
        "Gewicht": 10, "Schwimmen": -2, "Fliegen": -10, "Gift Speien": 0, "Tarnung": 1,
        "Geschwindigkeit": -10, "Sprung": -10, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 10,
        "Lebenspunkte": 20, "Ausweichen": -5, "Panzerung": 20, "Panzerung vor tödlichem Biss": 5,
        "Reaktion": -2, "Aktivität": -2, "Kondition": -2, "Feinderkennung": -2, "Angsteinflößend": 5,
        "Fortpflanzungsgeschwindigkeit": -1, "Zeit zur Erwachsenwerdung": 2
    },
    "stachelig": {
        "Gewicht": 7, "Schwimmen": -3, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": -3, "Panzerung": 10, "Panzerung vor tödlichem Biss": 3,
        "Reaktion": 0, "Aktivität": -1, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 8,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "farbig": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 8, "Tarnung": -15,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 3,
        "Fortpflanzungsgeschwindigkeit": 2, "Zeit zur Erwachsenwerdung": 0
    },
    "tarnung": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 20,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 5, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": -8, "Angsteinflößend": -5,
        "Fortpflanzungsgeschwindigkeit": 3, "Zeit zur Erwachsenwerdung": 0
    },
    "kopf_beisskraft": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 20, "Tödlicher Biss": 15, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 8,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "kopf_größe": {
        "Gewicht": 8, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 10, "Tödlicher Biss": 12, "Schwanzschlag": 0, "Kopfstoß": 15,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 5, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 8, "Angsteinflößend": 10,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 3
    },
    "kopf_hörner_anzahl": {
        "Gewicht": 3, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 20,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 8,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 12,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "kopf_hörner_größe": {
        "Gewicht": 5, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": -3, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 25,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 12,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 15,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "kragen_größe": {
        "Gewicht": 4, "Schwimmen": -2, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 18,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 6,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "maul_zahntyp": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 15, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 15, "Tödlicher Biss": 18, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 8,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "hals_länge": {
        "Gewicht": 2, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": -3, "Panzerung": 0, "Panzerung vor tödlichem Biss": -8,
        "Reaktion": -5, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 10, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "hals_breite": {
        "Gewicht": 6, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 5, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 8,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 10,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 5, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "körper_länge": {
        "Gewicht": 12, "Schwimmen": 3, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": -5, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 8, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 5, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 5
    },
    "körper_höhe": {
        "Gewicht": 15, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": -8, "Sprung": -10, "Biss": 3, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 12, "Ausweichen": -8, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 8, "Feinderkennung": 0, "Angsteinflößend": 8,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 8
    },
    "vorderbeine_länge": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 3, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 3, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 5, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "vorderbeine_stärke": {
        "Gewicht": 4, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 3, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 8, "Kondition": 5, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "vorderklauen_länge": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 2, "Tödlicher Biss": 5, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 3, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 6,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "hinterbeine_länge": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 15, "Sprung": 20, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 8, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 12, "Kondition": 8, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "hinterbeine_stärke": {
        "Gewicht": 8, "Schwimmen": 0, "Fliegen": -5, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 8, "Sprung": 25, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 5, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 10, "Kondition": 15, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "hinterklauen_länge": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 3, "Sprung": 0, "Biss": 1, "Tödlicher Biss": 8, "Schwanzschlag": 3, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 10,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "schwanz_länge": {
        "Gewicht": 5, "Schwimmen": 8, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 15, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 5, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 3, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "schwanz_breite": {
        "Gewicht": 8, "Schwimmen": 5, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 20, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": -3, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "schwanz_keule": {
        "Gewicht": 12, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": -5, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 30, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": -8, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 12,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "schwanz_stacheln": {
        "Gewicht": 6, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 25, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 8, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 15,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "flügel": {
        "Gewicht": -5, "Schwimmen": 0, "Fliegen": 25, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 5, "Sprung": 8, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 10, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 5,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "flossen": {
        "Gewicht": 3, "Schwimmen": 30, "Fliegen": -15, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": -8, "Sprung": -10, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "fleisch": {
        "Gewicht": 0, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 5, "Sprung": 0, "Biss": 5, "Tödlicher Biss": 3, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 5, "Aktivität": 8, "Kondition": 0, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 0, "Zeit zur Erwachsenwerdung": 0
    },
    "pflanzen": {
        "Gewicht": 2, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 0, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 5, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 10, "Feinderkennung": 0, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 5, "Zeit zur Erwachsenwerdung": -3
    },
    "aas": {
        "Gewicht": -2, "Schwimmen": 0, "Fliegen": 0, "Gift Speien": 5, "Tarnung": 0,
        "Geschwindigkeit": 0, "Sprung": 0, "Biss": 0, "Tödlicher Biss": 0, "Schwanzschlag": 0, "Kopfstoß": 0,
        "Lebenspunkte": 0, "Ausweichen": 0, "Panzerung": 0, "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 0, "Aktivität": 0, "Kondition": 0, "Feinderkennung": 8, "Angsteinflößend": 0,
        "Fortpflanzungsgeschwindigkeit": 3, "Zeit zur Erwachsenwerdung": 0
    }
};

// ===================================
// SPEZIALFÄHIGKEITEN KONFIGURATION
// ===================================

const SPECIAL_ABILITIES = {
    'Schwimmen': {
        icon: '🏊',
        requirements: (props) => props.flossen >= 50,
        description: 'Ermöglicht effiziente Fortbewegung im Wasser'
    },
    'Gift Speien': {
        icon: '☠️',
        requirements: (props) => props.maul_zahntyp >= 50 && props.farbig >= 50,
        description: 'Kann Gift über mittlere Distanzen speien'
    },
    'Fliegen': {
        icon: '🦅',
        requirements: (props) => props.flügel >= 50,
        description: 'Ermöglicht Flug und verbesserte Mobilität'
    },
    'Tödlicher Biss': {
        icon: '💀',
        requirements: (props) => props.kopf_beisskraft >= 50 || props.maul_zahntyp >= 70,
        description: 'Extrem gefährlicher Biss mit hoher Letalität'
    },
    'Schwanzschlag': {
        icon: '🐉',
        requirements: (props) => props.schwanz_länge >= 50 && (props.schwanz_keule > 0 || props.schwanz_stacheln > 0 || props.schwanz_breite >= 50),
        description: 'Kraftvoller Schwanzangriff'
    }
};

// ===================================
// HAUPTBERECHNUNGS-FUNKTION
// ===================================

/**
 * Berechnet alle Fähigkeiten eines Dinosauriers basierend auf seinen Eigenschaften
 * @param {Object} properties - Die Eigenschaften des Dinosauriers (0-100 Werte)
 * @returns {Object} - Objekt mit allen berechneten Fähigkeiten
 */
function calculateDinoAbilities(properties) {
    // Basis-Werte für alle Fähigkeiten
    const abilities = {
        "Gewicht": 50,
        "Tarnung": 0,
        "Geschwindigkeit": 50,
        "Sprung": 50,
        "Biss": 0,
        "Kopfstoß": 0,
        "Lebenspunkte": 50,
        "Ausweichen": 50,
        "Panzerung": 0,
        "Panzerung vor tödlichem Biss": 0,
        "Reaktion": 50,
        "Aktivität": 50,
        "Kondition": 50,
        "Feinderkennung": 50,
        "Angsteinflößend": 10,
        "Fortpflanzungsgeschwindigkeit": 50,
        "Zeit zur Erwachsenwerdung": 50
    };

    // Schwellwert-basierte Fähigkeiten (werden nur angezeigt wenn Bedingung erfüllt)
    const conditionalAbilities = {
        "Schwimmen": 0,
        "Gift Speien": 0,
        "Fliegen": 0,
        "Tödlicher Biss": 0,
        "Schwanzschlag": 0
    };

    // Für jede Eigenschaft des Dinos die Einflüsse berechnen
    Object.keys(properties).forEach(propertyName => {
        const propertyValue = properties[propertyName];
        const propertyConfig = DINO_ABILITIES_CONFIG[propertyName];
        
        if (propertyConfig && propertyValue > 0) {
            Object.keys(propertyConfig).forEach(abilityName => {
                const influence = propertyConfig[abilityName];
                if (influence !== 0) {
                    const effect = (propertyValue / 100) * influence;
                    
                    if (abilities.hasOwnProperty(abilityName)) {
                        abilities[abilityName] += effect;
                    } else if (conditionalAbilities.hasOwnProperty(abilityName)) {
                        conditionalAbilities[abilityName] += effect;
                    }
                }
            });
        }
    });

    // Schwellwerte prüfen und entsprechende Fähigkeiten hinzufügen
    Object.keys(SPECIAL_ABILITIES).forEach(abilityName => {
        const config = SPECIAL_ABILITIES[abilityName];
        if (config.requirements(properties)) {
            if (conditionalAbilities.hasOwnProperty(abilityName)) {
                abilities[abilityName] = Math.max(0, Math.min(100, Math.round(conditionalAbilities[abilityName])));
            }
        }
    });

    // Normale Werte auf 0-100 begrenzen (außer Gewicht kann höher gehen)
    Object.keys(abilities).forEach(abilityName => {
        if (abilityName === "Gewicht") {
            abilities[abilityName] = Math.max(10, Math.round(abilities[abilityName]));
        } else if (!Object.keys(SPECIAL_ABILITIES).includes(abilityName)) {
            abilities[abilityName] = Math.max(0, Math.min(100, Math.round(abilities[abilityName])));
        }
    });

    return abilities;
}

// ===================================
// HILFSFUNKTIONEN
// ===================================

/**
 * Findet die Konfiguration für eine bestimmte Eigenschaft
 * @param {string} propertyName - Name der Eigenschaft
 * @returns {Object|null} - Konfigurationsobjekt oder null
 */
function findPropertyConfig(propertyName) {
    for (const category of Object.values(PROPERTY_CONFIG)) {
        if (category[propertyName]) {
            return category[propertyName];
        }
    }
    return null;
}

/**
 * Gibt alle verfügbaren Spezialfähigkeiten eines Dinos zurück
 * @param {Object} properties - Die Eigenschaften des Dinosauriers
 * @returns {Array} - Array der verfügbaren Spezialfähigkeiten
 */
function getAvailableSpecialAbilities(properties) {
    const available = [];
    
    Object.keys(SPECIAL_ABILITIES).forEach(abilityName => {
        const config = SPECIAL_ABILITIES[abilityName];
        if (config.requirements(properties)) {
            available.push({
                name: abilityName,
                icon: config.icon,
                description: config.description
            });
        }
    });
    
    return available;
}

/**
 * Berechnet die Gesamtkosten aller Eigenschaften
 * @param {Object} properties - Die Eigenschaften des Dinosauriers
 * @returns {number} - Gesamtkosten in Evolutionspunkten
 */
function calculateTotalCost(properties) {
    let totalCost = 0;
    
    Object.keys(properties).forEach(propertyName => {
        const value = properties[propertyName];
        const config = findPropertyConfig(propertyName);
        
        if (config && value > 0) {
            totalCost += value * config.cost;
        }
    });
    
    return totalCost;
}

/**
 * Prüft ob eine Eigenschaftsänderung möglich ist
 * @param {Object} properties - Aktuelle Eigenschaften
 * @param {string} propertyName - Name der zu ändernden Eigenschaft
 * @param {number} newValue - Neuer Wert (0-100)
 * @param {number} availablePoints - Verfügbare Evolutionspunkte
 * @returns {Object} - {possible: boolean, cost: number, refund: number}
 */
function canChangeProperty(properties, propertyName, newValue, availablePoints) {
    const config = findPropertyConfig(propertyName);
    if (!config) {
        return { possible: false, cost: 0, refund: 0 };
    }
    
    const currentValue = properties[propertyName] || 0;
    const delta = newValue - currentValue;
    
    if (delta > 0) {
        const cost = delta * config.cost;
        return {
            possible: cost <= availablePoints,
            cost: cost,
            refund: 0
        };
    } else if (delta < 0) {
        const refund = Math.floor((currentValue - newValue) * config.cost / 2);
        return {
            possible: true,
            cost: 0,
            refund: refund
        };
    }
    
    return { possible: true, cost: 0, refund: 0 };
}

// ===================================
// EXPORT (Browser & Node.js kompatibel)
// ===================================

// Browser-Umgebung
if (typeof window !== 'undefined') {
    window.DinoAbilities = {
        PROPERTY_CONFIG,
        DINO_ABILITIES_CONFIG,
        SPECIAL_ABILITIES,
        calculateDinoAbilities,
        findPropertyConfig,
        getAvailableSpecialAbilities,
        calculateTotalCost,
        canChangeProperty
    };
}

// Node.js-Umgebung
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PROPERTY_CONFIG,
        DINO_ABILITIES_CONFIG,
        SPECIAL_ABILITIES,
        calculateDinoAbilities,
        findPropertyConfig,
        getAvailableSpecialAbilities,
        calculateTotalCost,
        canChangeProperty
    };
}