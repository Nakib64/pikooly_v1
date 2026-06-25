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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_path: string | null
          placement: string
          slot_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          page_path?: string | null
          placement: string
          slot_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          placement?: string
          slot_id?: string | null
        }
        Relationships: []
      }
      admin_activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_cashouts: {
        Row: {
          account_details: string | null
          admin_notes: string | null
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          method: string
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_details?: string | null
          admin_notes?: string | null
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          method: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_details?: string | null
          admin_notes?: string | null
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          method?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_cashouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          affiliate_code: string
          affiliate_id: string
          created_at: string
          id: string
          ip: string | null
          landing_path: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_code: string
          affiliate_id: string
          created_at?: string
          id?: string
          ip?: string | null
          landing_path?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_code?: string
          affiliate_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          landing_path?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          bonus_type: string
          bonus_value: number
          commission_amount: number
          created_at: string
          credited_to_wallet: boolean
          id: string
          order_id: string
          order_number: string | null
          order_total: number
          status: string
        }
        Insert: {
          affiliate_id: string
          bonus_type: string
          bonus_value: number
          commission_amount?: number
          created_at?: string
          credited_to_wallet?: boolean
          id?: string
          order_id: string
          order_number?: string | null
          order_total?: number
          status?: string
        }
        Update: {
          affiliate_id?: string
          bonus_type?: string
          bonus_value?: number
          commission_amount?: number
          created_at?: string
          credited_to_wallet?: boolean
          id?: string
          order_id?: string
          order_number?: string | null
          order_total?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          bonus_type: string
          bonus_value: number
          cookie_days: number
          created_at: string
          id: string
          min_cashout: number
          program_enabled: boolean
          terms: string | null
          updated_at: string
        }
        Insert: {
          bonus_type?: string
          bonus_value?: number
          cookie_days?: number
          created_at?: string
          id?: string
          min_cashout?: number
          program_enabled?: boolean
          terms?: string | null
          updated_at?: string
        }
        Update: {
          bonus_type?: string
          bonus_value?: number
          cookie_days?: number
          created_at?: string
          id?: string
          min_cashout?: number
          program_enabled?: boolean
          terms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          clicks: number
          code: string
          created_at: string
          custom_bonus_type: string | null
          custom_bonus_value: number | null
          email: string | null
          full_name: string | null
          id: string
          payout_details: string | null
          payout_method: string | null
          pending_balance: number
          phone: string | null
          status: string
          total_earned: number
          total_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          clicks?: number
          code: string
          created_at?: string
          custom_bonus_type?: string | null
          custom_bonus_value?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          payout_details?: string | null
          payout_method?: string | null
          pending_balance?: number
          phone?: string | null
          status?: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          clicks?: number
          code?: string
          created_at?: string
          custom_bonus_type?: string | null
          custom_bonus_value?: number | null
          email?: string | null
          full_name?: string | null
          id?: string
          payout_details?: string | null
          payout_method?: string | null
          pending_balance?: number
          phone?: string | null
          status?: string
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          gift_category_ids: string[] | null
          id: string
          image_url: string | null
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          subcategories: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          gift_category_ids?: string[] | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          subcategories?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          gift_category_ids?: string[] | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          subcategories?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bouquet_colors: {
        Row: {
          created_at: string
          display_order: number
          hex_code: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          hex_code?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          hex_code?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bouquet_flowers: {
        Row: {
          available_districts: string[]
          available_thanas: string[]
          colors: Json
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          next_day_districts: string[]
          next_day_thanas: string[]
          price: number
          same_day_districts: string[]
          same_day_thanas: string[]
          updated_at: string
        }
        Insert: {
          available_districts?: string[]
          available_thanas?: string[]
          colors?: Json
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          next_day_districts?: string[]
          next_day_thanas?: string[]
          price?: number
          same_day_districts?: string[]
          same_day_thanas?: string[]
          updated_at?: string
        }
        Update: {
          available_districts?: string[]
          available_thanas?: string[]
          colors?: Json
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          next_day_districts?: string[]
          next_day_thanas?: string[]
          price?: number
          same_day_districts?: string[]
          same_day_thanas?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      bouquet_materials: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      bouquet_orders: {
        Row: {
          created_at: string
          flowers: Json
          gift_message: string | null
          id: string
          material_id: string | null
          order_id: string | null
          selected_color: string | null
          size_id: string | null
          total_price: number
        }
        Insert: {
          created_at?: string
          flowers?: Json
          gift_message?: string | null
          id?: string
          material_id?: string | null
          order_id?: string | null
          selected_color?: string | null
          size_id?: string | null
          total_price?: number
        }
        Update: {
          created_at?: string
          flowers?: Json
          gift_message?: string | null
          id?: string
          material_id?: string | null
          order_id?: string | null
          selected_color?: string | null
          size_id?: string | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bouquet_orders_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "bouquet_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bouquet_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bouquet_orders_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "bouquet_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      bouquet_sizes: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          extra_price: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          extra_price?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          extra_price?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_quote_requests: {
        Row: {
          admin_notes: string | null
          company_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          message: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          required_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          message?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity: number
          required_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          message?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          required_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_addons: {
        Row: {
          available_districts: string[]
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          available_districts?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available_districts?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          allow_custom_image: boolean
          allow_custom_text: boolean
          category_type: string
          category_types: string[]
          cod_enabled: boolean
          created_at: string
          description: string | null
          display_order: number
          faq: Json | null
          hide_delivery_datetime: boolean
          id: string
          image_url: string | null
          is_active: boolean
          long_description: string | null
          name: string
          seo_title: string | null
          short_description: string | null
          show_cart_addons: boolean
          show_in_header: boolean
          show_in_homepage: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          allow_custom_image?: boolean
          allow_custom_text?: boolean
          category_type?: string
          category_types?: string[]
          cod_enabled?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          faq?: Json | null
          hide_delivery_datetime?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          name: string
          seo_title?: string | null
          short_description?: string | null
          show_cart_addons?: boolean
          show_in_header?: boolean
          show_in_homepage?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          allow_custom_image?: boolean
          allow_custom_text?: boolean
          category_type?: string
          category_types?: string[]
          cod_enabled?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          faq?: Json | null
          hide_delivery_datetime?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          name?: string
          seo_title?: string | null
          short_description?: string | null
          show_cart_addons?: boolean
          show_in_header?: boolean
          show_in_homepage?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_delivery_modes: {
        Row: {
          category_id: string
          created_at: string
          fallback_mode_id: string | null
          id: string
          mode_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          fallback_mode_id?: string | null
          id?: string
          mode_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          fallback_mode_id?: string | null
          id?: string
          mode_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_delivery_modes_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrations: {
        Row: {
          bg_color: string | null
          created_at: string
          date_label: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          name: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          date_label: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          date_label?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          show_on_blog_sidebar: boolean
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          show_on_blog_sidebar?: boolean
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          show_on_blog_sidebar?: boolean
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          display_order: number
          exchange_rate: number
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_email_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          subject: string
          template_key: string | null
          to_email: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject: string
          template_key?: string | null
          to_email: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_key?: string | null
          to_email?: string
        }
        Relationships: []
      }
      delivery_mode_cities: {
        Row: {
          charge_override: number | null
          city_name: string
          created_at: string
          id: string
          mode_id: string
          thana: string | null
        }
        Insert: {
          charge_override?: number | null
          city_name: string
          created_at?: string
          id?: string
          mode_id: string
          thana?: string | null
        }
        Update: {
          charge_override?: number | null
          city_name?: string
          created_at?: string
          id?: string
          mode_id?: string
          thana?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_mode_cities_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_mode_exclusions: {
        Row: {
          city_name: string
          created_at: string
          id: string
          mode_id: string
          scope: string
          scope_id: string
          thana: string | null
          updated_at: string
        }
        Insert: {
          city_name: string
          created_at?: string
          id?: string
          mode_id: string
          scope: string
          scope_id: string
          thana?: string | null
          updated_at?: string
        }
        Update: {
          city_name?: string
          created_at?: string
          id?: string
          mode_id?: string
          scope?: string
          scope_id?: string
          thana?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_mode_exclusions_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_modes: {
        Row: {
          badge_text: string | null
          charge_type: string
          created_at: string
          delivery_time: string
          flat_charge: number
          icon: string | null
          id: string
          is_active: boolean
          key: string
          max_charge: number
          min_charge: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          charge_type?: string
          created_at?: string
          delivery_time?: string
          flat_charge?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          max_charge?: number
          min_charge?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          charge_type?: string
          created_at?: string
          delivery_time?: string
          flat_charge?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          max_charge?: number
          min_charge?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_otps: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          order_id: string
          otp_hash: string
          phone: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          order_id: string
          otp_hash: string
          phone: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          order_id?: string
          otp_hash?: string
          phone?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_otps_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          device_info: Json
          id: string
          is_active: boolean
          last_seen_at: string
          platform: string
          seller_id: string | null
          token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          seller_id?: string | null
          token: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          seller_id?: string | null
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          id: string
          is_active: boolean
          provider: string
          reply_to: string | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_secure: boolean
          smtp_username: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string
          id?: string
          is_active?: boolean
          provider?: string
          reply_to?: string | null
          smtp_host?: string
          smtp_password: string
          smtp_port?: number
          smtp_secure?: boolean
          smtp_username: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          provider?: string
          reply_to?: string | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_secure?: boolean
          smtp_username?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_body: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_body: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          html_body?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          metadata: Json | null
          otp_code: string | null
          purpose: string
          token: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          metadata?: Json | null
          otp_code?: string | null
          purpose: string
          token: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          otp_code?: string | null
          purpose?: string
          token?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_bookings: {
        Row: {
          booking_number: string
          category_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          event_date: string
          event_time: string | null
          guest_count: number | null
          id: string
          notes: string | null
          package_id: string | null
          payment_method: string
          payment_status: string
          special_requests: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
          venue_address: string
        }
        Insert: {
          booking_number: string
          category_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          event_date: string
          event_time?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_method?: string
          payment_status?: string
          special_requests?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
          venue_address: string
        }
        Update: {
          booking_number?: string
          category_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          event_date?: string
          event_time?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_method?: string
          payment_status?: string
          special_requests?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
          venue_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bookings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "event_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          long_description: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_packages: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          features: Json
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          name: string
          original_price: number | null
          price: number
          seo_description: string | null
          seo_title: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          original_price?: number | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          original_price?: number | null
          price?: number
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gifting_stories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          label: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: []
      }
      home_living_gifts: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_gift_items: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          estimated_value: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          estimated_value?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          estimated_value?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_program_settings: {
        Row: {
          banner_image_url: string | null
          created_at: string
          draw_batch_size: number
          gift_card_message: string | null
          id: string
          is_enabled: boolean
          min_orders_to_qualify: number
          public_description: string | null
          public_subtitle: string | null
          public_title: string
          show_on_homepage: boolean
          updated_at: string
          winners_per_batch: number
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          draw_batch_size?: number
          gift_card_message?: string | null
          id?: string
          is_enabled?: boolean
          min_orders_to_qualify?: number
          public_description?: string | null
          public_subtitle?: string | null
          public_title?: string
          show_on_homepage?: boolean
          updated_at?: string
          winners_per_batch?: number
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          draw_batch_size?: number
          gift_card_message?: string | null
          id?: string
          is_enabled?: boolean
          min_orders_to_qualify?: number
          public_description?: string | null
          public_subtitle?: string | null
          public_title?: string
          show_on_homepage?: boolean
          updated_at?: string
          winners_per_batch?: number
        }
        Relationships: []
      }
      loyalty_winners: {
        Row: {
          admin_notes: string | null
          batch_number: number | null
          confirmation_photo_url: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_email: string | null
          customer_feedback: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          dispatch_status: string
          dispatched_at: string | null
          gift_card_message: string | null
          gift_item_id: string | null
          gift_name: string | null
          id: string
          order_id: string | null
          order_number: string | null
          pickup_instructions: string | null
          total_orders_at_draw: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          batch_number?: number | null
          confirmation_photo_url?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_email?: string | null
          customer_feedback?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          dispatch_status?: string
          dispatched_at?: string | null
          gift_card_message?: string | null
          gift_item_id?: string | null
          gift_name?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          pickup_instructions?: string | null
          total_orders_at_draw?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          batch_number?: number | null
          confirmation_photo_url?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_email?: string | null
          customer_feedback?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          dispatch_status?: string
          dispatched_at?: string | null
          gift_card_message?: string | null
          gift_item_id?: string | null
          gift_name?: string | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          pickup_instructions?: string | null
          total_orders_at_draw?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_winners_gift_item_id_fkey"
            columns: ["gift_item_id"]
            isOneToOne: false
            referencedRelation: "loyalty_gift_items"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string | null
          created_at: string
          error: string | null
          event_key: string | null
          id: string
          payload: Json
          provider: string
          response: Json
          status: string
          target_type: string
          target_value: string | null
          title: string | null
          tokens_failed: number
          tokens_success: number
          tokens_total: number
          triggered_by: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          error?: string | null
          event_key?: string | null
          id?: string
          payload?: Json
          provider?: string
          response?: Json
          status?: string
          target_type: string
          target_value?: string | null
          title?: string | null
          tokens_failed?: number
          tokens_success?: number
          tokens_total?: number
          triggered_by?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          error?: string | null
          event_key?: string | null
          id?: string
          payload?: Json
          provider?: string
          response?: Json
          status?: string
          target_type?: string
          target_value?: string | null
          title?: string | null
          tokens_failed?: number
          tokens_success?: number
          tokens_total?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body_template: string
          click_url_template: string | null
          created_at: string
          enabled: boolean
          event_key: string
          id: string
          label: string
          title_template: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body_template?: string
          click_url_template?: string | null
          created_at?: string
          enabled?: boolean
          event_key: string
          id?: string
          label: string
          title_template?: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body_template?: string
          click_url_template?: string | null
          created_at?: string
          enabled?: boolean
          event_key?: string
          id?: string
          label?: string
          title_template?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      offer_banners: {
        Row: {
          bg_color: string | null
          bg_image_url: string | null
          created_at: string
          cta_text: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          logo_url: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          bg_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          logo_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          bg_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          logo_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          custom_images: string[] | null
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          selected_color: string | null
          selected_size: string | null
          seller_price: number | null
          total: number
        }
        Insert: {
          created_at?: string
          custom_images?: string[] | null
          id?: string
          order_id: string
          price?: number
          product_id?: string | null
          product_name: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          seller_price?: number | null
          total?: number
        }
        Update: {
          created_at?: string
          custom_images?: string[] | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          seller_price?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          advance_amount: number
          affiliate_code: string | null
          affiliate_id: string | null
          alt_phone: string | null
          assigned_seller_id: string | null
          billing_country: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          deleted_by: string | null
          delivery_address: string
          delivery_date: string | null
          delivery_fee: number
          delivery_time: string | null
          delivery_type: string | null
          discount: number
          district_id: string | null
          due_amount: number
          gift_message: string | null
          id: string
          is_preorder: boolean
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string
          recipient_name: string | null
          status: string
          subtotal: number
          total: number
          tracking_number: string | null
          upazila_id: string | null
          upazila_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advance_amount?: number
          affiliate_code?: string | null
          affiliate_id?: string | null
          alt_phone?: string | null
          assigned_seller_id?: string | null
          billing_country?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_address: string
          delivery_date?: string | null
          delivery_fee?: number
          delivery_time?: string | null
          delivery_type?: string | null
          discount?: number
          district_id?: string | null
          due_amount?: number
          gift_message?: string | null
          id?: string
          is_preorder?: boolean
          notes?: string | null
          order_number: string
          payment_method?: string
          payment_status?: string
          recipient_name?: string | null
          status?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
          upazila_id?: string | null
          upazila_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advance_amount?: number
          affiliate_code?: string | null
          affiliate_id?: string | null
          alt_phone?: string | null
          assigned_seller_id?: string | null
          billing_country?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_address?: string
          delivery_date?: string | null
          delivery_fee?: number
          delivery_time?: string | null
          delivery_type?: string | null
          discount?: number
          district_id?: string | null
          due_amount?: number
          gift_message?: string | null
          id?: string
          is_preorder?: boolean
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          recipient_name?: string | null
          status?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
          upazila_id?: string | null
          upazila_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_seller_id_fkey"
            columns: ["assigned_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "shipping_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_pages: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
          path: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label: string
          path: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
          path?: string
        }
        Relationships: []
      }
      perf_psi_runs: {
        Row: {
          cls: number | null
          created_at: string
          error: string | null
          fcp_ms: number | null
          id: string
          inp_ms: number | null
          lcp_ms: number | null
          page_id: string | null
          performance_score: number | null
          si_ms: number | null
          strategy: string
          tbt_ms: number | null
          ttfb_ms: number | null
          url: string
        }
        Insert: {
          cls?: number | null
          created_at?: string
          error?: string | null
          fcp_ms?: number | null
          id?: string
          inp_ms?: number | null
          lcp_ms?: number | null
          page_id?: string | null
          performance_score?: number | null
          si_ms?: number | null
          strategy: string
          tbt_ms?: number | null
          ttfb_ms?: number | null
          url: string
        }
        Update: {
          cls?: number | null
          created_at?: string
          error?: string | null
          fcp_ms?: number | null
          id?: string
          inp_ms?: number | null
          lcp_ms?: number | null
          page_id?: string | null
          performance_score?: number | null
          si_ms?: number | null
          strategy?: string
          tbt_ms?: number | null
          ttfb_ms?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_psi_runs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "perf_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_rum_events: {
        Row: {
          created_at: string
          device: string | null
          id: string
          metric: string
          navigation_type: string | null
          path: string
          rating: string | null
          user_agent: string | null
          value: number
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          metric: string
          navigation_type?: string | null
          path: string
          rating?: string | null
          user_agent?: string | null
          value: number
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          metric?: string
          navigation_type?: string | null
          path?: string
          rating?: string | null
          user_agent?: string | null
          value?: number
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          otp_hash: string
          phone: string
          purpose: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          otp_hash: string
          phone: string
          purpose: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          otp_hash?: string
          phone?: string
          purpose?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      photo_bookings: {
        Row: {
          booking_number: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          district: string | null
          event_address: string
          event_date: string
          event_time: string | null
          id: string
          location_type: string
          notes: string | null
          package_id: string | null
          service_id: string | null
          status: string
          total: number
          travel_fee: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_number: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          district?: string | null
          event_address: string
          event_date: string
          event_time?: string | null
          id?: string
          location_type?: string
          notes?: string | null
          package_id?: string | null
          service_id?: string | null
          status?: string
          total?: number
          travel_fee?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_number?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          district?: string | null
          event_address?: string
          event_date?: string
          event_time?: string | null
          id?: string
          location_type?: string
          notes?: string | null
          package_id?: string | null
          service_id?: string | null
          status?: string
          total?: number
          travel_fee?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "photo_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "photo_services"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_packages: {
        Row: {
          created_at: string
          display_order: number
          duration: string
          features: Json
          id: string
          is_active: boolean
          name: string
          price: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          duration: string
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          duration?: string
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "photo_services"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_portfolio: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_embed_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_embed_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_embed_url?: string | null
        }
        Relationships: []
      }
      photo_services: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          short_description: string | null
          starting_price: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          short_description?: string | null
          starting_price?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          short_description?: string | null
          starting_price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      photo_travel_fees: {
        Row: {
          created_at: string
          district: string
          fee: number
          id: string
          is_available: boolean
          request_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          district: string
          fee?: number
          id?: string
          is_available?: boolean
          request_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          district?: string
          fee?: number
          id?: string
          is_available?: boolean
          request_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      popular_gifting: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          created_at: string
          display_order: number
          hex_code: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          product_id: string
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          hex_code?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          product_id: string
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          hex_code?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          product_id?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string
          display_order: number
          extra_price: number
          id: string
          is_active: boolean
          name: string
          product_id: string
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          extra_price?: number
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          extra_price?: number
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_subcategories: {
        Row: {
          created_at: string
          id: string
          product_id: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          subcategory_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_subcategories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_custom_image: boolean
          allow_custom_text: boolean
          approval_status: string
          bulk_min_quantity: number
          bulk_order_enabled: boolean
          bulk_pricing_tiers: Json
          category_id: string | null
          created_at: string
          delivery_info: string | null
          delivery_mode_id: string | null
          delivery_time: string | null
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          instructions: string | null
          is_active: boolean
          is_featured: boolean
          is_preorder: boolean
          name: string
          original_price: number | null
          preorder_advance_percent: number
          preorder_note: string | null
          price: number
          rating: number | null
          rejection_reason: string | null
          review_count: number | null
          seller_id: string | null
          seller_price: number | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          specifications: Json | null
          stock: number
          subcategory_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          allow_custom_image?: boolean
          allow_custom_text?: boolean
          approval_status?: string
          bulk_min_quantity?: number
          bulk_order_enabled?: boolean
          bulk_pricing_tiers?: Json
          category_id?: string | null
          created_at?: string
          delivery_info?: string | null
          delivery_mode_id?: string | null
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          instructions?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_preorder?: boolean
          name: string
          original_price?: number | null
          preorder_advance_percent?: number
          preorder_note?: string | null
          price?: number
          rating?: number | null
          rejection_reason?: string | null
          review_count?: number | null
          seller_id?: string | null
          seller_price?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          specifications?: Json | null
          stock?: number
          subcategory_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          allow_custom_image?: boolean
          allow_custom_text?: boolean
          approval_status?: string
          bulk_min_quantity?: number
          bulk_order_enabled?: boolean
          bulk_pricing_tiers?: Json
          category_id?: string | null
          created_at?: string
          delivery_info?: string | null
          delivery_mode_id?: string | null
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          instructions?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_preorder?: boolean
          name?: string
          original_price?: number | null
          preorder_advance_percent?: number
          preorder_note?: string | null
          price?: number
          rating?: number | null
          rejection_reason?: string | null
          review_count?: number | null
          seller_id?: string | null
          seller_price?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          specifications?: Json | null
          stock?: number
          subcategory_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_delivery_mode_id_fkey"
            columns: ["delivery_mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      relationship_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address: string
          created_at: string
          district: string | null
          full_name: string
          id: string
          is_default: boolean
          label: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          district?: string | null
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          count: number
          created_at: string
          id: string
          last_searched_at: string
          query_key: string
          query_text: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          last_searched_at?: string
          query_key: string
          query_text: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          last_searched_at?: string
          query_key?: string
          query_text?: string
        }
        Relationships: []
      }
      seller_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          seller_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          seller_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_categories_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_notifications: {
        Row: {
          created_at: string
          district_name: string | null
          id: string
          message: string
          order_id: string | null
          order_number: string | null
          read: boolean
          seller_id: string
          type: string
        }
        Insert: {
          created_at?: string
          district_name?: string | null
          id?: string
          message: string
          order_id?: string | null
          order_number?: string | null
          read?: boolean
          seller_id: string
          type?: string
        }
        Update: {
          created_at?: string
          district_name?: string | null
          id?: string
          message?: string
          order_id?: string | null
          order_number?: string | null
          read?: boolean
          seller_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_notifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payout_method_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          details: Json | null
          id: string
          method: string
          seller_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          details?: Json | null
          id?: string
          method: string
          seller_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          details?: Json | null
          id?: string
          method?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_payout_method_history_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payout_orders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          payout_id: string
          seller_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          payout_id: string
          seller_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          payout_id?: string
          seller_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "seller_payout_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payout_orders_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "seller_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          method_snapshot: Json | null
          notes: string | null
          paid_at: string
          paid_by: string | null
          reference: string | null
          seller_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          method_snapshot?: Json | null
          notes?: string | null
          paid_at?: string
          paid_by?: string | null
          reference?: string | null
          seller_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          method_snapshot?: Json | null
          notes?: string | null
          paid_at?: string
          paid_by?: string | null
          reference?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_subcategories: {
        Row: {
          created_at: string
          id: string
          seller_id: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          seller_id: string
          subcategory_id: string
        }
        Update: {
          created_at?: string
          id?: string
          seller_id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_subcategories_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          avatar_updated_at: string | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bkash_number: string | null
          can_edit_seo: boolean
          created_at: string
          district_id: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          name_updated_at: string | null
          password_changed_at: string | null
          payout_method: string | null
          payout_updated_at: string | null
          phone: string
          phone_updated_at: string | null
          status: string
          trade_license_number: string | null
          upazila_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_updated_at?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bkash_number?: string | null
          can_edit_seo?: boolean
          created_at?: string
          district_id?: string | null
          email: string
          id?: string
          is_active?: boolean
          name: string
          name_updated_at?: string | null
          password_changed_at?: string | null
          payout_method?: string | null
          payout_updated_at?: string | null
          phone: string
          phone_updated_at?: string | null
          status?: string
          trade_license_number?: string | null
          upazila_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_updated_at?: string | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bkash_number?: string | null
          can_edit_seo?: boolean
          created_at?: string
          district_id?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          name_updated_at?: string | null
          password_changed_at?: string | null
          payout_method?: string | null
          payout_updated_at?: string | null
          phone?: string
          phone_updated_at?: string | null
          status?: string
          trade_license_number?: string | null
          upazila_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: true
            referencedRelation: "shipping_districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sellers_upazila_id_fkey"
            columns: ["upazila_id"]
            isOneToOne: false
            referencedRelation: "upazilas"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_category_fees: {
        Row: {
          category_id: string
          created_at: string
          delivery_fee: number
          delivery_label: string | null
          district_id: string
          id: string
          next_day_fee: number | null
          same_day_fee: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          delivery_fee?: number
          delivery_label?: string | null
          district_id: string
          id?: string
          next_day_fee?: number | null
          same_day_fee?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          delivery_fee?: number
          delivery_label?: string | null
          district_id?: string
          id?: string
          next_day_fee?: number | null
          same_day_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_category_fees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_category_fees_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "shipping_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_districts: {
        Row: {
          created_at: string
          delivery_fee: number
          delivery_label: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          next_day_fee: number | null
          next_day_label: string | null
          postal_code: string | null
          same_day_fee: number | null
          same_day_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          delivery_label?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          next_day_fee?: number | null
          next_day_label?: string | null
          postal_code?: string | null
          same_day_fee?: number | null
          same_day_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          delivery_label?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          next_day_fee?: number | null
          next_day_label?: string | null
          postal_code?: string | null
          same_day_fee?: number | null
          same_day_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      sitemap_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          section_id: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          section_id: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          section_id?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitemap_links_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sitemap_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sitemap_sections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sliders: {
        Row: {
          bg_color: string | null
          bg_image_url: string | null
          created_at: string
          cta_text: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          bg_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          bg_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          category_types: string[]
          cod_enabled: boolean
          created_at: string
          description: string | null
          display_order: number
          faq: Json | null
          hide_delivery_datetime: boolean
          id: string
          image_url: string | null
          is_active: boolean
          long_description: string | null
          mega_menu_group: string | null
          name: string
          seo_title: string | null
          short_description: string | null
          show_cart_addons: boolean
          show_in_shop_by_category: boolean
          show_in_tailored: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          category_types?: string[]
          cod_enabled?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          faq?: Json | null
          hide_delivery_datetime?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          mega_menu_group?: string | null
          name: string
          seo_title?: string | null
          short_description?: string | null
          show_cart_addons?: boolean
          show_in_shop_by_category?: boolean
          show_in_tailored?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          category_types?: string[]
          cod_enabled?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          faq?: Json | null
          hide_delivery_datetime?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          long_description?: string | null
          mega_menu_group?: string | null
          name?: string
          seo_title?: string | null
          short_description?: string | null
          show_cart_addons?: boolean
          show_in_shop_by_category?: boolean
          show_in_tailored?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategory_delivery_modes: {
        Row: {
          created_at: string
          fallback_mode_id: string | null
          id: string
          mode_id: string
          subcategory_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fallback_mode_id?: string | null
          id?: string
          mode_id: string
          subcategory_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fallback_mode_id?: string | null
          id?: string
          mode_id?: string
          subcategory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategory_delivery_modes_fallback_mode_id_fkey"
            columns: ["fallback_mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategory_delivery_modes_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "delivery_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategory_delivery_modes_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: true
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      upazilas: {
        Row: {
          created_at: string
          delivery_fee: number | null
          display_order: number
          district_id: string
          id: string
          is_active: boolean
          name: string
          next_day_fee: number | null
          same_day_fee: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number | null
          display_order?: number
          district_id: string
          id?: string
          is_active?: boolean
          name: string
          next_day_fee?: number | null
          same_day_fee?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number | null
          display_order?: number
          district_id?: string
          id?: string
          is_active?: boolean
          name?: string
          next_day_fee?: number | null
          same_day_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upazilas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "shipping_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_checkout_order_item: {
        Args: { _order_id: string }
        Returns: boolean
      }
      can_subscribe_realtime_topic: {
        Args: { _topic: string }
        Returns: boolean
      }
      claim_seller_by_email: {
        Args: never
        Returns: {
          avatar_updated_at: string | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bkash_number: string | null
          can_edit_seo: boolean
          created_at: string
          district_id: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          name_updated_at: string | null
          password_changed_at: string | null
          payout_method: string | null
          payout_updated_at: string | null
          phone: string
          phone_updated_at: string | null
          status: string
          trade_license_number: string | null
          upazila_id: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "sellers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_checkout_order: {
        Args: { _order: Json }
        Returns: {
          id: string
          order_number: string
        }[]
      }
      create_pending_seller:
        | {
            Args: {
              _category_ids: string[]
              _district_id: string
              _trade_license?: string
            }
            Returns: {
              avatar_updated_at: string | null
              avatar_url: string | null
              bank_account_name: string | null
              bank_account_number: string | null
              bank_branch: string | null
              bank_name: string | null
              bank_routing_number: string | null
              bkash_number: string | null
              can_edit_seo: boolean
              created_at: string
              district_id: string | null
              email: string
              id: string
              is_active: boolean
              name: string
              name_updated_at: string | null
              password_changed_at: string | null
              payout_method: string | null
              payout_updated_at: string | null
              phone: string
              phone_updated_at: string | null
              status: string
              trade_license_number: string | null
              upazila_id: string | null
              updated_at: string
              user_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "sellers"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _category_ids: string[]
              _district_id: string
              _subcategory_ids?: string[]
              _trade_license?: string
            }
            Returns: {
              avatar_updated_at: string | null
              avatar_url: string | null
              bank_account_name: string | null
              bank_account_number: string | null
              bank_branch: string | null
              bank_name: string | null
              bank_routing_number: string | null
              bkash_number: string | null
              can_edit_seo: boolean
              created_at: string
              district_id: string | null
              email: string
              id: string
              is_active: boolean
              name: string
              name_updated_at: string | null
              password_changed_at: string | null
              payout_method: string | null
              payout_updated_at: string | null
              phone: string
              phone_updated_at: string | null
              status: string
              trade_license_number: string | null
              upazila_id: string | null
              updated_at: string
              user_id: string | null
            }
            SetofOptions: {
              from: "*"
              to: "sellers"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      find_seller_for_order:
        | {
            Args: { _category_ids: string[]; _district_id: string }
            Returns: string
          }
        | {
            Args: {
              _category_ids: string[]
              _district_id: string
              _subcategory_ids: string[]
            }
            Returns: string
          }
      get_remittance_checkout_order: {
        Args: { _order_id: string }
        Returns: {
          advance_amount: number
          id: string
          is_preorder: boolean
          notes: string
          order_number: string
          payment_method: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_seller: { Args: { _order_id: string }; Returns: boolean }
      is_product_owner_seller: {
        Args: { _seller_id: string }
        Returns: boolean
      }
      is_seller_for_district: {
        Args: { _district_id: string }
        Returns: boolean
      }
      log_search_query: { Args: { _query: string }; Returns: undefined }
      lookup_affiliate_by_code: {
        Args: { _code: string }
        Returns: {
          id: string
          status: string
          user_id: string
        }[]
      }
      submit_remittance_payment: {
        Args: {
          _ai_line?: string
          _method_key: string
          _method_label: string
          _mtcn: string
          _order_id: string
          _proof_url: string
          _service_key: string
          _service_label: string
        }
        Returns: {
          order_number: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "seller"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "seller"],
    },
  },
} as const
