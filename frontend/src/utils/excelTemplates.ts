import * as XLSX from 'xlsx'

export function downloadRequirementsTemplate() {
  const rows = [
    [
      'Краткое наименование предложения',
      'Инициатор предложения',
      'Ответственный со стороны предложения',
      'Условное разделение',
      'Предложение',
      'Комментарии и описание проблем',
      'Обсуждение',
      'Номер очереди при реализации',
      'Примечание',
      'Пункт ТЗ',
      'Статус',
      'Система',
    ],
    [
      'Пример предложения',
      'ГБУ "Система 112"',
      'Иванов Иван Иванович',
      'Инфраструктура',
      'Текст предложения',
      'Описание проблемы',
      'Краткое обсуждение',
      '1 очередь',
      'Примечание',
      'п.3.1.1.1.1.2',
      'Новое',
      '112',
    ],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Предложения')
  XLSX.writeFile(workbook, 'template_requirements.xlsx')
}

export function downloadTZTemplate() {
  const rows = [
    ['Код', 'Текст'],
    ['п.3.1.1.1.1.2', 'Если функция есть, то в рамках рефакторинга, если нет, то развития'],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Пункты ТЗ')
  XLSX.writeFile(workbook, 'template_tz_points.xlsx')
}