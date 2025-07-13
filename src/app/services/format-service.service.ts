import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormatService {

  constructor() { }

  formatNumberToPad(num: any, padStart:number) {
    return String(parseInt(""+num)).padStart(padStart, '0');
  }

  formatNumberToDevice(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) {
      return ''; // Gérer les valeurs invalides
    }

    if (Number.isInteger(value)) {
      if (value < 100) {
        return value.toFixed(2).replace('.', ','); // Ajoute ,00
      } else {
        return value.toString(); // Garde l'entier
      }
    }

    return value.toFixed(2).replace('.', ','); // Affiche avec 2 décimales
  }

  public sortByCreation(tab:any){
    return tab.sort((a:any, b:any) => {
      const [dayA, monthA, yearA] = a.creation.split('/').map(Number);
      const [dayB, monthB, yearB] = b.creation.split('/').map(Number);

      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);

      return dateA.getTime() - dateB.getTime(); // plus ancienne -> plus récente
    });
  }
}
