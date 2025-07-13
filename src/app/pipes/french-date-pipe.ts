import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'frenchDate',
  standalone: true
})
export class FrenchDatePipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return '';

    const [day, month, year] = value.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const formatted = new Intl.DateTimeFormat('fr-FR', options).format(date);

    // Mettre une majuscule au début de chaque mot
    return formatted.replace(/\b\w/g, c => c.toUpperCase());
  }
}
