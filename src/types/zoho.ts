export interface ZohoUser {
  id: string;
  name: string;
  email: string;
}

export interface ZohoDeal {
  id: string;
  Deal_Name: string;
  Stage: string;
  Amount: number;
  Closing_Date: string;
  Owner?: {
    id: string;
    name: string;
  };
  Created_Time: string;
  Last_Modified_Time: string;
}

export interface ZohoDealsResponse {
  data: ZohoDeal[];
  total: number;
} 