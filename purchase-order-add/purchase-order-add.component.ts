import { TaxtypeService } from "src/app/core/_services/taxtype.service";
import { UserService } from "src/app/core/_services/user.service";
import { PurchaseOrderService } from "./../../../core/_services/purchaseorder.service";
import { SupplierService } from "./../../../core/_services/supplier.service";
import { Component, OnInit } from "@angular/core";
import { User } from "../../../core/_models/user";
import { AuthenticationService } from "../../../core/_services/authentication.service";
import { Product } from "../../../core/_models/product";
import { Router } from "@angular/router";
import { SelectItem } from "primeng/components/common/selectitem";
import { InventoryService } from "../../../core/_services/inventory.service";
import { ToastrService } from "ngx-toastr";
import { CurrencyService } from "src/app/core/_services/currency.service";

const swal = require("sweetalert");

@Component({
  selector: "app-purchase-order-add",
  templateUrl: "./purchase-order-add.component.html",
  styleUrls: ["./purchase-order-add.component.scss"],
})
export class PurchaseOrderAddComponent implements OnInit {
  sysuser: User;
  LoadUI: boolean = false;
  private sub1: any;
  productslist: SelectItem[];

  suppliers: SelectItem[];
  supplier: any;

  poitems = [];
  total = 0;
  submitted: boolean = false;
  uniqueid: string;

  cols: any[];
  tax_calc_type: any = "EXCLUSIVE";

  validated: boolean = false;

  currency: any = null;
  currencies: any;
  currency_rate: any = null;
  sales_reps: any;
  engineer: any;
  project_name: any;
  po_types: { label: string; value: string }[];
  po_type: any;
  tax_types: SelectItem[];
  tax_type: number;

  constructor(
    private authservice: AuthenticationService,
    private poservice: PurchaseOrderService,
    private inventoryservice: InventoryService,
    private toastr: ToastrService,
    private router: Router,
    private supplierservice: SupplierService,
    private currencyservice: CurrencyService,
    private userservice: UserService,
    private taxtypeservice: TaxtypeService
  ) {}

  ngOnInit() {
    this.generateuniquekey();
    this.getTaxTypes();

    this.userservice.getAll().subscribe((sales_reps) => {
      this.sales_reps = sales_reps;
    });

    this.po_type = "LOCAL";
    this.authservice.validateUser().subscribe((sysuser) => {
      this.sysuser = sysuser;
      this.getCurrencies();
      this.LoadUI = true;
    });

    this.engineer = null;
    this.cols = [
      { field: "productcode", header: "Product Code" },
      { field: "productname", header: "Product Name" },
      { field: "consumable", header: "Consumable" },
      { field: "actions", header: "Actions", sortable: true },
    ];

    this.po_types = [
      { label: "LOCAL", value: "LOCAL" },
      { label: "IMPORT", value: "IMPORT" },
    ];

    // // get products list
    // this.sub1 = this.inventoryservice.getAll().subscribe((products) => {
    //   this.productslist = products;
    // });

    //product list
    this.getProducts();

    //suppliers list
    this.supplierservice.getAll().subscribe((suppliers) => {
      this.suppliers = [];
      this.suppliers.push({ label: "Please Select", value: null });
      for (var i = 0; i < suppliers.length; i++) {
        this.suppliers.push({
          label: suppliers[i].suppliername,
          value: suppliers[i],
        });
      }
    });

    //add 1 line
    this.addLine(1);
  }

  getCurrencies() {
    // currencies
    this.currencyservice.getAll().subscribe((currencies) => {
      this.currencies = currencies;
      var index = currencies.findIndex(
        (x) =>
          x.c_code === this.sysuser.app_settings.basic_settings.default_currency
      );

      if (index != -1) {
        this.currency = currencies[index];
        this.currency_rate = currencies[index].today_rate;
      }
    });
  }

  generateuniquekey() {
    var num1 = new Date().valueOf();
    var num2 = Math.random().toString(36).substring(7);
    this.uniqueid = num1 + num2;
  }

  getProducts() {
    // get products list
    this.sub1 = this.inventoryservice.getAll().subscribe((products) => {
      this.productslist = [];
      this.productslist.push({ label: "Please Select", value: null });
      for (var i = 0; i < products.length; i++) {
        this.productslist.push({
          label: products[i].productcode + ": " + products[i].productname,
          value: products[i],
        });
      }
    });
  }

  additem(item, qty_feild, total_feild, table) {
    var qty = qty_feild.value;
    var total = total_feild.value;
    if (qty == null || qty == "" || qty <= 0.0) {
      swal("Error!", "Please enter the Quantity and Try Again!", "warning");
      return;
    }
    if (total == null || total == "" || total < 0.0) {
      swal(
        "Error!",
        "Please enter the Total Cost Amount and Try Again!",
        "warning"
      );
      return;
    } else {
      this.poitems.push({
        itemid: item.id,
        itemcode: item.productcode,
        itemname: item.productname,
        quantity: qty,
        unit: item.unit,
        unitprice: total / qty,
        totalcost: total,
      });
      this.total = this.total + parseFloat(total);

      this.toastr.success("Item has been added", "Added!!", {
        positionClass: "toast-top-right",
        closeButton: true,
      });

      table.reset();
      total_feild.value = null;
      qty_feild.value = null;
    }
    //this.selectedclient = true;
  }

  removeitem(index, itemtotal) {
    if (this.poitems[index].totalcost <= 0) {
      this.poitems.splice(index, 1);
      this.calculateTotal();
    } else {
      swal({
        title: "Are You sure?",
        text:
          "Do you want to remove " +
          this.poitems[index].itemname +
          " from the cart?",
        icon: "info",
        buttons: {
          cancel: true,
          confirm: true,
        },
        confirmButtonColor: "#149916",
        confirmButtonText: "Confirm!",
        closeOnConfirm: true,
      }).then((result) => {
        if (result) {
          this.total = this.total - itemtotal;
          this.poitems.splice(index, 1);

          swal(
            "Item removed!",
            "Item has been removed from the cart!",
            "success"
          );
        }
      });
    }
  }

  submitPO() {
    if (this.supplier == null) {
      swal("Error!", "Supplier must be selected", "warning");
      return;
    }
    if (this.currency == null) {
      swal("Error!", "Currency must be selected", "warning");
      return;
    }

    if (this.currency_rate <= 0) {
      swal("Error!", "Currency Rate is required", "warning");
      return;
    }
    if (this.poitems.length > 0) {
      var obj = {
        supplier: this.supplier.id,
        currency: this.currency.id,
        currency_rate: this.currency_rate,
        total: this.total,
        po_type: this.po_type,
        items: this.poitems,
        engineer: this.engineer,
        project_name: this.project_name,
        // tax_types: this.tax_type,
        tax_calc_type: this.tax_calc_type,
        uniquekey: this.uniqueid,
      };

      swal({
        title: "Are You sure?",
        text: "Please confirm that you want to finalize this Purchase Order.!",
        icon: "info",
        buttons: {
          cancel: true,
          confirm: true,
        },
        confirmButtonColor: "#149916",
        confirmButtonText: "Confirm!",
        closeOnConfirm: true,
      }).then((result) => {
        if (result) {
          this.submitted = true;
          //send and get response from API
          //console.log(obj)
          this.poservice.createPO(obj).subscribe(
            (data) => {
              if (data.status) {
                swal("Good job!", "Purchase Order has been saved!", "success");
                this.router.navigate([
                  "/inventory/purchaseorder/detail/" + data.id,
                ]);
              } else {
                swal(data.err);
                this.submitted = false;
              }
            },
            (error) => {
              swal("API Error Occured. Try Again!");
              this.submitted = false;
            }
          );
        }
      });
    } else {
      //if cart is empty
      this.toastr.warning(
        "You must add atleast one item to proceed!",
        "Cart Empty !!",
        {
          positionClass: "toast-top-right",
          closeButton: true,
        }
      );
    }
  }

  setCurrencyRate() {
    if (this.currency != null) {
      this.currency_rate = this.currency.today_rate;
    }
  }

  addLine(lines) {
    this.validated = false;
    //save previous entries
    for (let item of this.poitems) {
      if (item.totalcost != null) {
        item.unitprice = item.totalcost / item.quantity;
        item.input_enabled = false;
      }
    }

    //add line
    for (let i = 0; i < lines; i++) {
      this.poitems.push({
        product: null,
        quantity: null,
        unitprice: null,
        totalcost: null,
        input_enabled: true,
      });
    }
    this.calculateTotal();
  }

  setTaxType() {
    if (this.supplier != null && this.supplier.tax_type != null) {
      this.tax_type = this.supplier.tax_type.id;
    } else {
      this.tax_type = null;
    }
  }

  clearEmptyrows() {
    for (let i = 0; i < this.poitems.length; i++) {
      if (
        this.poitems[i].product == null ||
        this.poitems[i].quantity == null ||
        this.poitems[i].totalcost == null
      ) {
        this.poitems.splice(i, 1);
      }
    }
  }

  calculateTotal() {
    this.total = 0;
    this.validated = true;
    for (let item of this.poitems) {
      if (
        item.totalcost != null &&
        item.product != null &&
        item.quantity != null
      ) {
        item.unitprice = item.totalcost / item.quantity;
        this.total = this.total + item.totalcost;

        item.input_enabled = false;
      } else {
        this.validated = false;
      }
    }
  }

  validateData() {
    this.calculateTotal();
    for (let item of this.poitems) {
      if (
        item.totalcost != null &&
        item.product != null &&
        item.quantity != null
      ) {
        //do nothing
      } else {
        item.input_enabled = false;
      }
    }
  }

  setValues(type) {
    for (let po_item of this.poitems) {
      if (po_item.product != null && po_item.unitprice == null) {
        po_item.unitprice = po_item.product.last_purchased_price;
      }
      if (
        po_item.product != null &&
        po_item.unitprice != null &&
        po_item.quantity == null &&
        po_item.totalcost == null
      ) {
        po_item.unitprice = po_item.product.last_purchased_price;
      }

      if (
        po_item.unitprice != null &&
        po_item.quantity != null &&
        po_item.totalcost == null
      ) {
        po_item.totalcost = po_item.unitprice * po_item.quantity;
      }
      if (
        po_item.unitprice == null &&
        po_item.quantity > 0 &&
        po_item.totalcost != null
      ) {
        po_item.unitprice = po_item.totalcost / po_item.quantity;
      }

      if (type == 1) {
        if (
          po_item.unitprice != null &&
          po_item.quantity != null &&
          po_item.totalcost != null
        ) {
          po_item.totalcost = po_item.unitprice * po_item.quantity;
        }
      } else if (type == 2) {
        if (
          po_item.unitprice != null &&
          po_item.quantity != null &&
          po_item.totalcost != null
        ) {
          po_item.unitprice = po_item.totalcost / po_item.quantity;
        }
      } else {
        if (
          po_item.unitprice != null &&
          po_item.quantity != null &&
          po_item.totalcost != null
        ) {
          po_item.totalcost = po_item.unitprice * po_item.quantity;
        }
      }
    }
  }
  getTaxTypes() {
    this.tax_types = [];

    this.taxtypeservice.getAll().subscribe((data) => {
      this.tax_types = [];
      this.tax_types.push({ label: "Please Select", value: null });
      for (var i = 0; i < data.all_taxes.length; i++) {
        this.tax_types.push({
          label: data.all_taxes[i].description,
          value: data.all_taxes[i].id,
        });
      }
    });
  }
}
