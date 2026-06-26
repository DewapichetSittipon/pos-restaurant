import { ArrayNotEmpty, IsInt } from 'class-validator';

export class SplitBillDto {
  // โต๊ะว่างปลายทางที่จะแยกรายการที่เลือกไปเปิดเป็นบิลใหม่
  @IsInt()
  toTableId!: number;

  // id ของ OrderItem ในบิลต้นทางที่จะย้ายไปบิลใหม่ (ต้องเหลืออย่างน้อย 1 รายการที่ต้นทาง)
  @ArrayNotEmpty()
  @IsInt({ each: true })
  orderItemIds!: number[];
}
