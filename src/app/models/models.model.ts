export interface Journee {
    id?:           number;
    date:          string;
    nom:           string;
    statut:        Statut;
    adresse:       string;
    codepostal:    string;
    tel:           string;
    mail:          string;
    mariagenet?:   string;
    devis:         Devis;
    factures:      Facture[];
    planning:      Planning;
    essai:         Essai;
    mariage:       Mariage;
    prestataires?: number;
    etape:         number;
}

export interface Devis {
    annee?:    string;
    numero?:   number | string;
    prestas?:  Presta[];
    creation?: string;
    echeance?: string;
}

export interface Presta {
    en?:         string;
    nom:         string;
    qte:         number | string;
    prix:        number | string;
    reduc?:      number | string;
    kilorly?:    boolean;
    time?:       number;
    bride?:      boolean;
    onlyOne?:    boolean;
    coiffure?:   boolean;
    maquillage?: boolean;
    hourly?:     boolean;
    index?:      number;
    presta?:     number | string;
}

export interface Essai {
    date?:  string;
    heure?: string;
    lieu?:  string;
}

export interface Facture {
    annee:            string;
    solde?:           number | string;
    numero:           number | string;
    prestas:          Presta[];
    creation:         string;
    type?:            Type;
    paiementprestas?: number | string;
}

export enum Type {
    Chèque = "Chèque ",
    Empty = "",
    Virement = "Virement",
}

export interface Mariage {
    adresse?:    string;
    domaine?:    string;
    ceremonie?:  string;
    codepostal?: string;
}

export interface Planning {
    date?:            string;
    adresse?:         string;
    domaine?:         string;
    invitees?:        Array<Array<number | string>>;
    ceremonie?:       string;
    collegues?:       Array<string[]>;
    codepostal?:      string;
    finprestas?:      string;
    planningprestas?: Presta[];
}

export interface CalendarGrid {
    day: number | null; 
    isPast: boolean;
    isToday: boolean;
    statut: string | null;
    noPlanning: boolean;
    events: number;
}

export enum Statut {
    Autre = "autre",
    Demande = "demande",
    Essai = "essai",
    Perso = "perso",
    Reserve = "reserve",
}