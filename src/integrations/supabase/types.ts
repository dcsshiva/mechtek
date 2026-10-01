export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string | null
          contact_id: string | null
          customer_id: string | null
          done_on: string | null
          due_on: string | null
          extra: Json | null
          id: string
          notes: string | null
          outcome: string | null
          owner_id: string | null
          promise_amount: number | null
          promise_date: string | null
          reference: string | null
          sort_order: number | null
          status: string | null
          subject: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_type?: string | null
          contact_id?: string | null
          customer_id?: string | null
          done_on?: string | null
          due_on?: string | null
          extra?: Json | null
          id: string
          notes?: string | null
          outcome?: string | null
          owner_id?: string | null
          promise_amount?: number | null
          promise_date?: string | null
          reference?: string | null
          sort_order?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_type?: string | null
          contact_id?: string | null
          customer_id?: string | null
          done_on?: string | null
          due_on?: string | null
          extra?: Json | null
          id?: string
          notes?: string | null
          outcome?: string | null
          owner_id?: string | null
          promise_amount?: number | null
          promise_date?: string | null
          reference?: string | null
          sort_order?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      bom_groups: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      bom_lines: {
        Row: {
          extra: Json | null
          group_name: string | null
          line_no: number
          material_code: string | null
          product_code: string
          qty: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          group_name?: string | null
          line_no: number
          material_code?: string | null
          product_code: string
          qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          group_name?: string | null
          line_no?: number
          material_code?: string | null
          product_code?: string
          qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["product_code"]
          },
        ]
      }
      bom_versions: {
        Row: {
          extra: Json | null
          line_count: number | null
          line_no: number
          note: string | null
          product_code: string
          released_at: string | null
          released_by: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          extra?: Json | null
          line_count?: number | null
          line_no: number
          note?: string | null
          product_code: string
          released_at?: string | null
          released_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          extra?: Json | null
          line_count?: number | null
          line_no?: number
          note?: string | null
          product_code?: string
          released_at?: string | null
          released_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      boms: {
        Row: {
          extra: Json | null
          product_code: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          product_code: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          product_code?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      child_item_specs: {
        Row: {
          child_item_code: string
          extra: Json | null
          label: string | null
          line_no: number
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          child_item_code: string
          extra?: Json | null
          label?: string | null
          line_no: number
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          child_item_code?: string
          extra?: Json | null
          label?: string | null
          line_no?: number
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_item_specs_child_item_code_fkey"
            columns: ["child_item_code"]
            isOneToOne: false
            referencedRelation: "child_items"
            referencedColumns: ["code"]
          },
        ]
      }
      child_items: {
        Row: {
          code: string
          description: string | null
          extra: Json | null
          family: string | null
          hsn: string | null
          kind: string | null
          name: string | null
          price: number | null
          sort_order: number | null
          source: string | null
          updated_at: string | null
          updated_by: string | null
          url: string | null
        }
        Insert: {
          code: string
          description?: string | null
          extra?: Json | null
          family?: string | null
          hsn?: string | null
          kind?: string | null
          name?: string | null
          price?: number | null
          sort_order?: number | null
          source?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          code?: string
          description?: string | null
          extra?: Json | null
          family?: string | null
          hsn?: string | null
          kind?: string | null
          name?: string | null
          price?: number | null
          sort_order?: number | null
          source?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
        }
        Relationships: []
      }
      combo_set_history: {
        Row: {
          at: string | null
          by_staff_id: string | null
          extra: Json | null
          line_no: number
          note: string | null
          product_code: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          at?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no: number
          note?: string | null
          product_code: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          at?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no?: number
          note?: string | null
          product_code?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combo_set_history_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "combo_sets"
            referencedColumns: ["product_code"]
          },
        ]
      }
      combo_set_lines: {
        Row: {
          extra: Json | null
          item_code: string | null
          line_no: number
          note: string | null
          price_included: number | null
          product_code: string
          qty: number | null
          standard_scope: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          item_code?: string | null
          line_no: number
          note?: string | null
          price_included?: number | null
          product_code: string
          qty?: number | null
          standard_scope?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          item_code?: string | null
          line_no?: number
          note?: string | null
          price_included?: number | null
          product_code?: string
          qty?: number | null
          standard_scope?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combo_set_lines_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "combo_sets"
            referencedColumns: ["product_code"]
          },
        ]
      }
      combo_sets: {
        Row: {
          extra: Json | null
          product_code: string
          revision: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          product_code: string
          revision?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          product_code?: string
          revision?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      company: {
        Row: {
          address: string | null
          code: string
          extra: Json | null
          gst_rate: number | null
          gstin: string | null
          name: string | null
          sort_order: number | null
          state: string | null
          state_code: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          code: string
          extra?: Json | null
          gst_rate?: number | null
          gstin?: string | null
          name?: string | null
          sort_order?: number | null
          state?: string | null
          state_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          extra?: Json | null
          gst_rate?: number | null
          gstin?: string | null
          name?: string | null
          sort_order?: number | null
          state?: string | null
          state_code?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      contact_roles: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          contact_role: string | null
          customer_id: string | null
          designation: string | null
          email: string | null
          extra: Json | null
          id: string
          is_primary: boolean | null
          mobile: string | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          contact_role?: string | null
          customer_id?: string | null
          designation?: string | null
          email?: string | null
          extra?: Json | null
          id: string
          is_primary?: boolean | null
          mobile?: string | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          contact_role?: string | null
          customer_id?: string | null
          designation?: string | null
          email?: string | null
          extra?: Json | null
          id?: string
          is_primary?: boolean | null
          mobile?: string | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          contact: string | null
          country: string | null
          credit_days: number | null
          credit_limit: number | null
          extra: Json | null
          gstin: string | null
          id: string
          name: string | null
          sort_order: number | null
          state: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact?: string | null
          country?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          extra?: Json | null
          gstin?: string | null
          id: string
          name?: string | null
          sort_order?: number | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact?: string | null
          country?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          extra?: Json | null
          gstin?: string | null
          id?: string
          name?: string | null
          sort_order?: number | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      debit_notes: {
        Row: {
          extra: Json | null
          id: string
          note_date: string | null
          reason: string | null
          sort_order: number | null
          tax: number | null
          taxable: number | null
          total: number | null
          updated_at: string | null
          updated_by: string | null
          vendor_bill_id: string | null
          vendor_id: string | null
        }
        Insert: {
          extra?: Json | null
          id: string
          note_date?: string | null
          reason?: string | null
          sort_order?: number | null
          tax?: number | null
          taxable?: number | null
          total?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          extra?: Json | null
          id?: string
          note_date?: string | null
          reason?: string | null
          sort_order?: number | null
          tax?: number | null
          taxable?: number | null
          total?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challan_lines: {
        Row: {
          delivery_challan_id: string
          extra: Json | null
          item_code: string | null
          line_no: number
          order_line: number | null
          qty: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          delivery_challan_id: string
          extra?: Json | null
          item_code?: string | null
          line_no: number
          order_line?: number | null
          qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          delivery_challan_id?: string
          extra?: Json | null
          item_code?: string | null
          line_no?: number
          order_line?: number | null
          qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challan_lines_delivery_challan_id_fkey"
            columns: ["delivery_challan_id"]
            isOneToOne: false
            referencedRelation: "delivery_challans"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challans: {
        Row: {
          dc_date: string | null
          eway_bill: string | null
          extra: Json | null
          id: string
          invoice_id: string | null
          lr_number: string | null
          sales_order_id: string | null
          shipping_bill: string | null
          sort_order: number | null
          transporter: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle: string | null
        }
        Insert: {
          dc_date?: string | null
          eway_bill?: string | null
          extra?: Json | null
          id: string
          invoice_id?: string | null
          lr_number?: string | null
          sales_order_id?: string | null
          shipping_bill?: string | null
          sort_order?: number | null
          transporter?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle?: string | null
        }
        Update: {
          dc_date?: string | null
          eway_bill?: string | null
          extra?: Json | null
          id?: string
          invoice_id?: string | null
          lr_number?: string | null
          sales_order_id?: string | null
          shipping_bill?: string | null
          sort_order?: number | null
          transporter?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      designations: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      doc_counters: {
        Row: {
          name: string
          updated_at: string | null
          updated_by: string | null
          value: number
        }
        Insert: {
          name: string
          updated_at?: string | null
          updated_by?: string | null
          value: number
        }
        Update: {
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      erp_write_access: {
        Row: {
          any_staff: boolean
          approvals: string[]
          can_delete: boolean
          collection: string
          modules: string[]
        }
        Insert: {
          any_staff?: boolean
          approvals?: string[]
          can_delete?: boolean
          collection: string
          modules?: string[]
        }
        Update: {
          any_staff?: boolean
          approvals?: string[]
          can_delete?: boolean
          collection?: string
          modules?: string[]
        }
        Relationships: []
      }
      gate_pass_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          gate_pass_id: string
          line_no: number
          note: string | null
          tone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          gate_pass_id: string
          line_no: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          gate_pass_id?: string
          line_no?: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_pass_history_gate_pass_id_fkey"
            columns: ["gate_pass_id"]
            isOneToOne: false
            referencedRelation: "gate_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_pass_lines: {
        Row: {
          arrived_unit: string | null
          arrived_unit_qty: number | null
          extra: Json | null
          gate_pass_id: string
          line_no: number
          material_code: string | null
          qty: number | null
          rejected_at_gate: number | null
          rejected_unit_qty: number | null
          rejection_reason: string | null
          returned_qty: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          arrived_unit?: string | null
          arrived_unit_qty?: number | null
          extra?: Json | null
          gate_pass_id: string
          line_no: number
          material_code?: string | null
          qty?: number | null
          rejected_at_gate?: number | null
          rejected_unit_qty?: number | null
          rejection_reason?: string | null
          returned_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          arrived_unit?: string | null
          arrived_unit_qty?: number | null
          extra?: Json | null
          gate_pass_id?: string
          line_no?: number
          material_code?: string | null
          qty?: number | null
          rejected_at_gate?: number | null
          rejected_unit_qty?: number | null
          rejection_reason?: string | null
          returned_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_pass_lines_gate_pass_id_fkey"
            columns: ["gate_pass_id"]
            isOneToOne: false
            referencedRelation: "gate_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_passes: {
        Row: {
          direction: string | null
          expected_back: string | null
          extra: Json | null
          grn_id: string | null
          id: string
          party_document: string | null
          party_id: string | null
          pass_date: string | null
          purchase_order_id: string | null
          purpose: string | null
          reference: string | null
          returnable: boolean | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle: string | null
        }
        Insert: {
          direction?: string | null
          expected_back?: string | null
          extra?: Json | null
          grn_id?: string | null
          id: string
          party_document?: string | null
          party_id?: string | null
          pass_date?: string | null
          purchase_order_id?: string | null
          purpose?: string | null
          reference?: string | null
          returnable?: boolean | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle?: string | null
        }
        Update: {
          direction?: string | null
          expected_back?: string | null
          extra?: Json | null
          grn_id?: string | null
          id?: string
          party_document?: string | null
          party_id?: string | null
          pass_date?: string | null
          purchase_order_id?: string | null
          purpose?: string | null
          reference?: string | null
          returnable?: boolean | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_passes_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          grn_id: string
          line_no: number
          note: string | null
          tone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          grn_id: string
          line_no: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          grn_id?: string
          line_no?: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_history_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_lines: {
        Row: {
          accepted_qty: number | null
          billed_qty: number | null
          counted_qty: number | null
          counted_unit: string | null
          extra: Json | null
          grn_id: string
          line_no: number
          material_code: string | null
          received_qty: number | null
          rejected_qty: number | null
          rejection_reason: string | null
          theoretical_qty: number | null
          updated_at: string | null
          updated_by: string | null
          weighed_kg: number | null
          weight_variance_pct: number | null
        }
        Insert: {
          accepted_qty?: number | null
          billed_qty?: number | null
          counted_qty?: number | null
          counted_unit?: string | null
          extra?: Json | null
          grn_id: string
          line_no: number
          material_code?: string | null
          received_qty?: number | null
          rejected_qty?: number | null
          rejection_reason?: string | null
          theoretical_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
          weighed_kg?: number | null
          weight_variance_pct?: number | null
        }
        Update: {
          accepted_qty?: number | null
          billed_qty?: number | null
          counted_qty?: number | null
          counted_unit?: string | null
          extra?: Json | null
          grn_id?: string
          line_no?: number
          material_code?: string | null
          received_qty?: number | null
          rejected_qty?: number | null
          rejection_reason?: string | null
          theoretical_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
          weighed_kg?: number | null
          weight_variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_lines_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["id"]
          },
        ]
      }
      grns: {
        Row: {
          extra: Json | null
          gate_entry_id: string | null
          grn_date: string | null
          id: string
          purchase_order_id: string | null
          received_by: string | null
          return_pass_id: string | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          vendor_id: string | null
        }
        Insert: {
          extra?: Json | null
          gate_entry_id?: string | null
          grn_date?: string | null
          id: string
          purchase_order_id?: string | null
          received_by?: string | null
          return_pass_id?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          extra?: Json | null
          gate_entry_id?: string | null
          grn_date?: string | null
          id?: string
          purchase_order_id?: string | null
          received_by?: string | null
          return_pass_id?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      indent_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          indent_id: string
          line_no: number
          note: string | null
          tone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          indent_id: string
          line_no: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          indent_id?: string
          line_no?: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indent_history_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents"
            referencedColumns: ["id"]
          },
        ]
      }
      indent_lines: {
        Row: {
          approved_qty: number | null
          extra: Json | null
          indent_id: string
          line_no: number
          material_code: string | null
          ordered_qty: number | null
          qty: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_qty?: number | null
          extra?: Json | null
          indent_id: string
          line_no: number
          material_code?: string | null
          ordered_qty?: number | null
          qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_qty?: number | null
          extra?: Json | null
          indent_id?: string
          line_no?: number
          material_code?: string | null
          ordered_qty?: number | null
          qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indent_lines_indent_id_fkey"
            columns: ["indent_id"]
            isOneToOne: false
            referencedRelation: "indents"
            referencedColumns: ["id"]
          },
        ]
      }
      indents: {
        Row: {
          department: string | null
          extra: Json | null
          id: string
          indent_date: string | null
          need_by: string | null
          raised_by: string | null
          reason: string | null
          sort_order: number | null
          source: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          department?: string | null
          extra?: Json | null
          id: string
          indent_date?: string | null
          need_by?: string | null
          raised_by?: string | null
          reason?: string | null
          sort_order?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          department?: string | null
          extra?: Json | null
          id?: string
          indent_date?: string | null
          need_by?: string | null
          raised_by?: string | null
          reason?: string | null
          sort_order?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      installed_machines: {
        Row: {
          amc_until: string | null
          customer_id: string | null
          delivery_challan_id: string | null
          engineer_id: string | null
          extra: Json | null
          installation_pending: boolean | null
          installed_on: string | null
          item_code: string | null
          operators_trained: boolean | null
          sales_order_id: string | null
          serial_no: string
          sort_order: number | null
          under_warranty: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amc_until?: string | null
          customer_id?: string | null
          delivery_challan_id?: string | null
          engineer_id?: string | null
          extra?: Json | null
          installation_pending?: boolean | null
          installed_on?: string | null
          item_code?: string | null
          operators_trained?: boolean | null
          sales_order_id?: string | null
          serial_no: string
          sort_order?: number | null
          under_warranty?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amc_until?: string | null
          customer_id?: string | null
          delivery_challan_id?: string | null
          engineer_id?: string | null
          extra?: Json | null
          installation_pending?: boolean | null
          installed_on?: string | null
          item_code?: string | null
          operators_trained?: boolean | null
          sales_order_id?: string | null
          serial_no?: string
          sort_order?: number | null
          under_warranty?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installed_machines_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          discount_pct: number | null
          extra: Json | null
          hsn: string | null
          invoice_id: string
          is_child_item: boolean | null
          item_code: string | null
          line_no: number
          list_price: number | null
          price_included: boolean | null
          qty: number | null
          rate: number | null
          taxable: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          discount_pct?: number | null
          extra?: Json | null
          hsn?: string | null
          invoice_id: string
          is_child_item?: boolean | null
          item_code?: string | null
          line_no: number
          list_price?: number | null
          price_included?: boolean | null
          qty?: number | null
          rate?: number | null
          taxable?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          discount_pct?: number | null
          extra?: Json | null
          hsn?: string | null
          invoice_id?: string
          is_child_item?: boolean | null
          item_code?: string | null
          line_no?: number
          list_price?: number | null
          price_included?: boolean | null
          qty?: number | null
          rate?: number | null
          taxable?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number | null
          extra: Json | null
          invoice_id: string
          line_no: number
          mode: string | null
          paid_on: string | null
          reference: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          extra?: Json | null
          invoice_id: string
          line_no: number
          mode?: string | null
          paid_on?: string | null
          reference?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          extra?: Json | null
          invoice_id?: string
          line_no?: number
          mode?: string | null
          paid_on?: string | null
          reference?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          advance_adjusted: number | null
          cgst: number | null
          customer_id: string | null
          customer_po: string | null
          delivery_challan_id: string | null
          due_date: string | null
          eway_bill: string | null
          extra: Json | null
          id: string
          igst: number | null
          invoice_date: string | null
          lr_number: string | null
          round_off: number | null
          sales_order_id: string | null
          sgst: number | null
          shipping_bill: string | null
          sort_order: number | null
          supply_type: string | null
          tax: number | null
          taxable: number | null
          total: number | null
          transporter: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle: string | null
        }
        Insert: {
          advance_adjusted?: number | null
          cgst?: number | null
          customer_id?: string | null
          customer_po?: string | null
          delivery_challan_id?: string | null
          due_date?: string | null
          eway_bill?: string | null
          extra?: Json | null
          id: string
          igst?: number | null
          invoice_date?: string | null
          lr_number?: string | null
          round_off?: number | null
          sales_order_id?: string | null
          sgst?: number | null
          shipping_bill?: string | null
          sort_order?: number | null
          supply_type?: string | null
          tax?: number | null
          taxable?: number | null
          total?: number | null
          transporter?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle?: string | null
        }
        Update: {
          advance_adjusted?: number | null
          cgst?: number | null
          customer_id?: string | null
          customer_po?: string | null
          delivery_challan_id?: string | null
          due_date?: string | null
          eway_bill?: string | null
          extra?: Json | null
          id?: string
          igst?: number | null
          invoice_date?: string | null
          lr_number?: string | null
          round_off?: number | null
          sales_order_id?: string | null
          sgst?: number | null
          shipping_bill?: string | null
          sort_order?: number | null
          supply_type?: string | null
          tax?: number | null
          taxable?: number | null
          total?: number | null
          transporter?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      item_kinds: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      lead_stages: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          customer_id: string | null
          extra: Json | null
          follow_up_on: string | null
          id: string
          item_code: string | null
          note: string | null
          qty: number | null
          sort_order: number | null
          source: string | null
          stage: string | null
          updated_at: string | null
          updated_by: string | null
          value: number | null
        }
        Insert: {
          customer_id?: string | null
          extra?: Json | null
          follow_up_on?: string | null
          id: string
          item_code?: string | null
          note?: string | null
          qty?: number | null
          sort_order?: number | null
          source?: string | null
          stage?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: number | null
        }
        Update: {
          customer_id?: string | null
          extra?: Json | null
          follow_up_on?: string | null
          id?: string
          item_code?: string | null
          note?: string | null
          qty?: number | null
          sort_order?: number | null
          source?: string | null
          stage?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          bin: string | null
          code: string
          extra: Json | null
          lead_days: number | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
          vendor_id: string | null
        }
        Insert: {
          bin?: string | null
          code: string
          extra?: Json | null
          lead_days?: number | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          bin?: string | null
          code?: string
          extra?: Json | null
          lead_days?: number | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      material_requisition_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          line_no: number
          material_requisition_id: string
          note: string | null
          tone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no: number
          material_requisition_id: string
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no?: number
          material_requisition_id?: string
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requisition_history_material_requisition_id_fkey"
            columns: ["material_requisition_id"]
            isOneToOne: false
            referencedRelation: "material_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requisition_lines: {
        Row: {
          approved_qty: number | null
          extra: Json | null
          indent_id: string | null
          issued_qty: number | null
          line_no: number
          material_code: string | null
          material_requisition_id: string
          qty: number | null
          received_qty: number | null
          return_reason: string | null
          returned_qty: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_qty?: number | null
          extra?: Json | null
          indent_id?: string | null
          issued_qty?: number | null
          line_no: number
          material_code?: string | null
          material_requisition_id: string
          qty?: number | null
          received_qty?: number | null
          return_reason?: string | null
          returned_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_qty?: number | null
          extra?: Json | null
          indent_id?: string | null
          issued_qty?: number | null
          line_no?: number
          material_code?: string | null
          material_requisition_id?: string
          qty?: number | null
          received_qty?: number | null
          return_reason?: string | null
          returned_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_requisition_lines_material_requisition_id_fkey"
            columns: ["material_requisition_id"]
            isOneToOne: false
            referencedRelation: "material_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requisitions: {
        Row: {
          extra: Json | null
          id: string
          previous_status: string | null
          purpose: string | null
          requested_by: string | null
          requested_on: string | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          work_order_id: string | null
        }
        Insert: {
          extra?: Json | null
          id: string
          previous_status?: string | null
          purpose?: string | null
          requested_by?: string | null
          requested_on?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          extra?: Json | null
          id?: string
          previous_status?: string | null
          purpose?: string | null
          requested_by?: string | null
          requested_on?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          work_order_id?: string | null
        }
        Relationships: []
      }
      material_units: {
        Row: {
          extra: Json | null
          factor: number | null
          line_no: number
          material_code: string
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          factor?: number | null
          line_no: number
          material_code: string
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          factor?: number | null
          line_no?: number
          material_code?: string
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_units_material_code_fkey"
            columns: ["material_code"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["code"]
          },
        ]
      }
      materials: {
        Row: {
          bin: string | null
          category_id: number | null
          code: string
          extra: Json | null
          is_job_work: boolean | null
          lead_days: number | null
          max_level: number | null
          name: string | null
          on_hand: number | null
          rate: number | null
          reorder_level: number | null
          sort_order: number | null
          uom: string | null
          updated_at: string | null
          updated_by: string | null
          vendor_id: string | null
        }
        Insert: {
          bin?: string | null
          category_id?: number | null
          code: string
          extra?: Json | null
          is_job_work?: boolean | null
          lead_days?: number | null
          max_level?: number | null
          name?: string | null
          on_hand?: number | null
          rate?: number | null
          reorder_level?: number | null
          sort_order?: number | null
          uom?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          bin?: string | null
          category_id?: number | null
          code?: string
          extra?: Json | null
          is_job_work?: boolean | null
          lead_days?: number | null
          max_level?: number | null
          name?: string | null
          on_hand?: number | null
          rate?: number | null
          reorder_level?: number | null
          sort_order?: number | null
          uom?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      product_families: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      product_specs: {
        Row: {
          extra: Json | null
          label: string | null
          line_no: number
          product_code: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          extra?: Json | null
          label?: string | null
          line_no: number
          product_code: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          extra?: Json | null
          label?: string | null
          line_no?: number
          product_code?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_specs_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          extra: Json | null
          family: string | null
          hsn: string | null
          kind: string | null
          name: string | null
          note: string | null
          price: number | null
          sort_order: number | null
          sub_family: string | null
          updated_at: string | null
          updated_by: string | null
          url: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          family?: string | null
          hsn?: string | null
          kind?: string | null
          name?: string | null
          note?: string | null
          price?: number | null
          sort_order?: number | null
          sub_family?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          family?: string | null
          hsn?: string | null
          kind?: string | null
          name?: string | null
          note?: string | null
          price?: number | null
          sort_order?: number | null
          sub_family?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
        }
        Relationships: []
      }
      purchase_order_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          line_no: number
          note: string | null
          purchase_order_id: string
          tone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no: number
          note?: string | null
          purchase_order_id: string
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no?: number
          note?: string | null
          purchase_order_id?: string
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_history_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          extra: Json | null
          line_no: number
          material_code: string | null
          order_qty: number | null
          order_rate: number | null
          order_unit: string | null
          purchase_order_id: string
          qty: number | null
          rate: number | null
          received_qty: number | null
          rejected_qty: number | null
          unit_factor: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          line_no: number
          material_code?: string | null
          order_qty?: number | null
          order_rate?: number | null
          order_unit?: string | null
          purchase_order_id: string
          qty?: number | null
          rate?: number | null
          received_qty?: number | null
          rejected_qty?: number | null
          unit_factor?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          line_no?: number
          material_code?: string | null
          order_qty?: number | null
          order_rate?: number | null
          order_unit?: string | null
          purchase_order_id?: string
          qty?: number | null
          rate?: number | null
          received_qty?: number | null
          rejected_qty?: number | null
          unit_factor?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          due_date: string | null
          extra: Json | null
          id: string
          indent_id: string | null
          po_date: string | null
          reason: string | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          vendor_id: string | null
        }
        Insert: {
          due_date?: string | null
          extra?: Json | null
          id: string
          indent_id?: string | null
          po_date?: string | null
          reason?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          due_date?: string | null
          extra?: Json | null
          id?: string
          indent_id?: string | null
          po_date?: string | null
          reason?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          line_no: number
          note: string | null
          quotation_id: string
          tone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no: number
          note?: string | null
          quotation_id: string
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no?: number
          note?: string | null
          quotation_id?: string
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_history_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_lines: {
        Row: {
          extra: Json | null
          item_code: string | null
          line_no: number
          list_price: number | null
          parent_line: number | null
          price: number | null
          price_included: boolean | null
          qty: number | null
          quotation_id: string
          standard_scope: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          item_code?: string | null
          line_no: number
          list_price?: number | null
          parent_line?: number | null
          price?: number | null
          price_included?: boolean | null
          qty?: number | null
          quotation_id: string
          standard_scope?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          item_code?: string | null
          line_no?: number
          list_price?: number | null
          parent_line?: number | null
          price?: number | null
          price_included?: boolean | null
          qty?: number | null
          quotation_id?: string
          standard_scope?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_lines_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          customer_id: string | null
          discount_pct: number | null
          dropped_standard_items: string[] | null
          extra: Json | null
          id: string
          lead_id: string | null
          prepared_by: string | null
          quote_date: string | null
          sales_order_id: string | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          customer_id?: string | null
          discount_pct?: number | null
          dropped_standard_items?: string[] | null
          extra?: Json | null
          id: string
          lead_id?: string | null
          prepared_by?: string | null
          quote_date?: string | null
          sales_order_id?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          customer_id?: string | null
          discount_pct?: number | null
          dropped_standard_items?: string[] | null
          extra?: Json | null
          id?: string
          lead_id?: string | null
          prepared_by?: string | null
          quote_date?: string | null
          sales_order_id?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_approvals: {
        Row: {
          allowed: boolean | null
          approval: string
          extra: Json | null
          line_no: number
          role_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed?: boolean | null
          approval: string
          extra?: Json | null
          line_no: number
          role_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed?: boolean | null
          approval?: string
          extra?: Json | null
          line_no?: number
          role_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_approvals_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          access: string | null
          extra: Json | null
          line_no: number
          module: string
          role_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          access?: string | null
          extra?: Json | null
          line_no: number
          module: string
          role_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          access?: string | null
          extra?: Json | null
          line_no?: number
          module?: string
          role_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          extra: Json | null
          id: string
          is_system: boolean | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          extra?: Json | null
          id: string
          is_system?: boolean | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          extra?: Json | null
          id?: string
          is_system?: boolean | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sales_order_lines: {
        Row: {
          dispatched_qty: number | null
          extra: Json | null
          item_code: string | null
          line_no: number
          list_price: number | null
          parent_line: number | null
          price: number | null
          price_included: boolean | null
          qty: number | null
          sales_order_id: string
          standard_scope: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          dispatched_qty?: number | null
          extra?: Json | null
          item_code?: string | null
          line_no: number
          list_price?: number | null
          parent_line?: number | null
          price?: number | null
          price_included?: boolean | null
          qty?: number | null
          sales_order_id: string
          standard_scope?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          dispatched_qty?: number | null
          extra?: Json | null
          item_code?: string | null
          line_no?: number
          list_price?: number | null
          parent_line?: number | null
          price?: number | null
          price_included?: boolean | null
          qty?: number | null
          sales_order_id?: string
          standard_scope?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_payments: {
        Row: {
          amount: number | null
          extra: Json | null
          line_no: number
          mode: string | null
          paid_on: string | null
          reference: string | null
          sales_order_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          extra?: Json | null
          line_no: number
          mode?: string | null
          paid_on?: string | null
          reference?: string | null
          sales_order_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          extra?: Json | null
          line_no?: number
          mode?: string | null
          paid_on?: string | null
          reference?: string | null
          sales_order_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          advance_amount: number | null
          advance_pct: number | null
          advance_received: boolean | null
          customer_id: string | null
          customer_po: string | null
          customer_po_date: string | null
          discount_pct: number | null
          dispatched: boolean | null
          dispatched_on: string | null
          due_date: string | null
          extra: Json | null
          id: string
          on_credit: boolean | null
          order_date: string | null
          quotation_id: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          advance_amount?: number | null
          advance_pct?: number | null
          advance_received?: boolean | null
          customer_id?: string | null
          customer_po?: string | null
          customer_po_date?: string | null
          discount_pct?: number | null
          dispatched?: boolean | null
          dispatched_on?: string | null
          due_date?: string | null
          extra?: Json | null
          id: string
          on_credit?: boolean | null
          order_date?: string | null
          quotation_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          advance_amount?: number | null
          advance_pct?: number | null
          advance_received?: boolean | null
          customer_id?: string | null
          customer_po?: string | null
          customer_po_date?: string | null
          discount_pct?: number | null
          dispatched?: boolean | null
          dispatched_on?: string | null
          due_date?: string | null
          extra?: Json | null
          id?: string
          on_credit?: boolean | null
          order_date?: string | null
          quotation_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tickets: {
        Row: {
          extra: Json | null
          id: string
          issue: string | null
          opened_on: string | null
          serial_no: string | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          id: string
          issue?: string | null
          opened_on?: string | null
          serial_no?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          id?: string
          issue?: string | null
          opened_on?: string | null
          serial_no?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean | null
          date_joined: string | null
          department: string | null
          designation: string | null
          email: string | null
          employee_code: string | null
          extra: Json | null
          id: string
          mobile: string | null
          name: string | null
          role_id: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          date_joined?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string | null
          extra?: Json | null
          id: string
          mobile?: string | null
          name?: string | null
          role_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          date_joined?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string | null
          extra?: Json | null
          id?: string
          mobile?: string | null
          name?: string | null
          role_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          extra: Json | null
          gst_code: string | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          gst_code?: string | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          gst_code?: string | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      stock_adjustment_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          line_no: number
          note: string | null
          stock_adjustment_id: string
          tone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no: number
          note?: string | null
          stock_adjustment_id: string
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no?: number
          note?: string | null
          stock_adjustment_id?: string
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_history_stock_adjustment_id_fkey"
            columns: ["stock_adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_on: string | null
          counted_qty: number | null
          extra: Json | null
          id: string
          material_code: string | null
          raised_by: string | null
          reason: string | null
          sort_order: number | null
          status: string | null
          system_qty: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          adjusted_on?: string | null
          counted_qty?: number | null
          extra?: Json | null
          id: string
          material_code?: string | null
          raised_by?: string | null
          reason?: string | null
          sort_order?: number | null
          status?: string | null
          system_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          adjusted_on?: string | null
          counted_qty?: number | null
          extra?: Json | null
          id?: string
          material_code?: string | null
          raised_by?: string | null
          reason?: string | null
          sort_order?: number | null
          status?: string | null
          system_qty?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      stock_ledger: {
        Row: {
          balance: number | null
          extra: Json | null
          id: string
          material_code: string | null
          movement_type: string | null
          posted_at: string | null
          posted_by: string | null
          posted_time: string | null
          qty_in: number | null
          qty_out: number | null
          reference: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          balance?: number | null
          extra?: Json | null
          id: string
          material_code?: string | null
          movement_type?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posted_time?: string | null
          qty_in?: number | null
          qty_out?: number | null
          reference?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          balance?: number | null
          extra?: Json | null
          id?: string
          material_code?: string | null
          movement_type?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posted_time?: string | null
          qty_in?: number | null
          qty_out?: number | null
          reference?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      uoms: {
        Row: {
          code: string
          extra: Json | null
          name: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          extra?: Json | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      vendor_bill_history: {
        Row: {
          action: string | null
          at: string | null
          at_time: string | null
          by_staff_id: string | null
          extra: Json | null
          line_no: number
          note: string | null
          tone: string | null
          updated_at: string | null
          updated_by: string | null
          vendor_bill_id: string
        }
        Insert: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id: string
        }
        Update: {
          action?: string | null
          at?: string | null
          at_time?: string | null
          by_staff_id?: string | null
          extra?: Json | null
          line_no?: number
          note?: string | null
          tone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_history_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bill_lines: {
        Row: {
          accepted_qty: number | null
          billed_amount: number | null
          billed_unit: string | null
          billed_unit_qty: number | null
          billed_unit_rate: number | null
          extra: Json | null
          line_no: number
          material_code: string | null
          po_rate: number | null
          qty: number | null
          rate: number | null
          updated_at: string | null
          updated_by: string | null
          vendor_bill_id: string
        }
        Insert: {
          accepted_qty?: number | null
          billed_amount?: number | null
          billed_unit?: string | null
          billed_unit_qty?: number | null
          billed_unit_rate?: number | null
          extra?: Json | null
          line_no: number
          material_code?: string | null
          po_rate?: number | null
          qty?: number | null
          rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id: string
        }
        Update: {
          accepted_qty?: number | null
          billed_amount?: number | null
          billed_unit?: string | null
          billed_unit_qty?: number | null
          billed_unit_rate?: number | null
          extra?: Json | null
          line_no?: number
          material_code?: string | null
          po_rate?: number | null
          qty?: number | null
          rate?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_lines_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bill_payments: {
        Row: {
          amount: number | null
          extra: Json | null
          line_no: number
          mode: string | null
          paid_on: string | null
          reference: string | null
          updated_at: string | null
          updated_by: string | null
          vendor_bill_id: string
        }
        Insert: {
          amount?: number | null
          extra?: Json | null
          line_no: number
          mode?: string | null
          paid_on?: string | null
          reference?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id: string
        }
        Update: {
          amount?: number | null
          extra?: Json | null
          line_no?: number
          mode?: string | null
          paid_on?: string | null
          reference?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_payments_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bills: {
        Row: {
          approved_total: number | null
          booked_on: string | null
          extra: Json | null
          grn_id: string | null
          id: string
          match_status: string | null
          purchase_order_id: string | null
          sort_order: number | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          vendor_id: string | null
          vendor_invoice_date: string | null
          vendor_invoice_no: string | null
        }
        Insert: {
          approved_total?: number | null
          booked_on?: string | null
          extra?: Json | null
          grn_id?: string | null
          id: string
          match_status?: string | null
          purchase_order_id?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_no?: string | null
        }
        Update: {
          approved_total?: number | null
          booked_on?: string | null
          extra?: Json | null
          grn_id?: string | null
          id?: string
          match_status?: string | null
          purchase_order_id?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vendor_id?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean | null
          city: string | null
          contact: string | null
          email: string | null
          extra: Json | null
          gstin: string | null
          id: string
          is_msme: boolean | null
          name: string | null
          payment_terms_days: number | null
          phone: string | null
          sort_order: number | null
          state: string | null
          supplies: string | null
          udyam_no: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          contact?: string | null
          email?: string | null
          extra?: Json | null
          gstin?: string | null
          id: string
          is_msme?: boolean | null
          name?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          sort_order?: number | null
          state?: string | null
          supplies?: string | null
          udyam_no?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          city?: string | null
          contact?: string | null
          email?: string | null
          extra?: Json | null
          gstin?: string | null
          id?: string
          is_msme?: boolean | null
          name?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          sort_order?: number | null
          state?: string | null
          supplies?: string | null
          udyam_no?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          extra: Json | null
          id: string
          item_code: string | null
          material_issued: boolean | null
          order_line: number | null
          qty: number | null
          sales_order_id: string | null
          sort_order: number | null
          stage: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          extra?: Json | null
          id: string
          item_code?: string | null
          material_issued?: boolean | null
          order_line?: number | null
          qty?: number | null
          sales_order_id?: string | null
          sort_order?: number | null
          stage?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          extra?: Json | null
          id?: string
          item_code?: string | null
          material_issued?: boolean | null
          order_line?: number | null
          qty?: number | null
          sales_order_id?: string | null
          sort_order?: number | null
          stage?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      erp_can_delete: { Args: { coll: string }; Returns: boolean }
      erp_can_read: { Args: never; Returns: boolean }
      erp_can_write: { Args: { coll: string }; Returns: boolean }
      erp_is_admin: { Args: never; Returns: boolean }
      erp_is_staff: { Args: never; Returns: boolean }
      erp_load_sample: {
        Args: { payload: Json; wipe?: boolean }
        Returns: undefined
      }
      erp_me: { Args: never; Returns: Json }
      erp_store_empty: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
