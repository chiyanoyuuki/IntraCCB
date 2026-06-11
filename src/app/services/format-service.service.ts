import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormatService {

  constructor() { }

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
