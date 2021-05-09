import { UserService } from "src/app/core/_services/user.service";
import { Component, OnInit, OnDestroy, Input } from "@angular/core";
import { AuthenticationService } from "../../../core/_services/authentication.service";
import { ActivatedRoute } from "@angular/router";
const swal = require("sweetalert");
import * as moment from "moment";
import { Product } from "../../../core/_models/product";
import { InventoryService } from "../../../core/_services/inventory.service";
import { PurchaseOrderService } from "../../../core/_services/purchaseorder.service";
import { SelectItem } from "primeng/components/common/selectitem";
import { ToastrService } from "ngx-toastr";
import { CurrencyService } from "src/app/core/_services/currency.service";
// import { CancelRequestService } from "../../../core/_services/cancelrequest.service";
import * as printJS from "print-js";
import { GlobalVariable } from "../../../core/_services/globals";

@Component({
  selector: "app-purchase-order-detail",
  templateUrl: "./purchase-order-detail.component.html",
  styleUrls: ["./purchase-order-detail.component.scss"],
})
export class PurchaseOrderDetailComponent implements OnInit, OnDestroy {
  sysuser: any;
  LoadUI: boolean = false;
  po_data: any;
  items: any = [];
  id: number;
  private sub: any;
  private sub1: any;
  purchaseorder_data: any;
  tax_breakdown: any[] = [];

  productslist: SelectItem[];
  productslist_draft: SelectItem[];

  updateitem: boolean = false;
  updatingid: number = null;
  calculated: boolean = false;
  addDiscount: boolean = false;

  @Input() newqty: number = 0;
  @Input() newcost: number = 0;
  @Input() newtotal: number = 0;
  @Input() discountamt: number = 0;
  @Input() newdiscount: number = 0;
  @Input() newdiscount_type: any;
  po_date;
  uniqueid: string;

  cols: any[];
  validated: boolean = false;
  draft_data = false;
  sales_reps: any;
  engineer: any;
  cancel_reason: any = null;

  currency: any = null;
  currencies: any;
  currency_rate: any = null;
  project_name: any;

  print_request = false;

  consignee_details = null;
  delivery_address = null;
  notify_party_1 = null;
  notify_party_2 = null;
  buyer = null;
  marks_Nos = null;

  edit_specification: any = null;
  edit_specification_item: any = null;

  edit_all_discount: any = null;
  edit_all_discount_type: any = null;

  constructor(
    private route: ActivatedRoute,
    private authservice: AuthenticationService,
    private poservice: PurchaseOrderService,
    private inventoryservice: InventoryService,
    private toastr: ToastrService,
    private userservice: UserService,
    private currencyservice: CurrencyService // private cancelrequestservice: CancelRequestService
  ) {}

  ngOnInit() {
    this.generateuniquekey();

    this.authservice.validateUser().subscribe((sysuser) => {
      this.sysuser = sysuser;
    });

    this.userservice.getAll().subscribe((sales_reps) => {
      this.sales_reps = sales_reps;
    });

    this.sub = this.route.params.subscribe((params) => {
      this.id = +params["id"];
      this.getData(this.id);
    });
    this.engineer = null;

    this.cols = [
      { field: "productcode", header: "Product Code" },
      { field: "productname", header: "Product Name" },
      { field: "consumable", header: "Consumable" },
      { field: "actions", header: "Actions", sortable: true },
    ];

    // currencies
    this.currencyservice.getAll().subscribe((currencies) => {
      this.currencies = currencies;
    });
  }

  generateuniquekey() {
    var num1 = new Date().valueOf();
    var num2 = Math.random().toString(36).substring(7);
    this.uniqueid = num1 + num2;
  }

  getData(id) {
    // po details
    this.poservice.getPO(id).subscribe((data) => {
      if (data) {
        // Do if true

        this.po_data = data.po;
        this.tax_breakdown = data.tax_breakdown;
        this.po_date = moment(data.timestamp).format("YYYY-MM-DD");
        this.LoadUI = true;
        this.getPoitems();

        if (this.po_data.status != 10) {
          this.getProductList();
        }

        console.log(this.po_data);
      }
    });

    // PO items
  }
  getPoitems() {
    this.poservice.getPOitems(this.id).subscribe((data) => {
      if (data) {
        // PO is completed
        if (this.po_data.status == 10) {
          this.items = data;
        } else {
          for (let item of data) {
            item.synced_status = true;
            item.input_enabled = false;
            item.net_total = parseFloat(item.totalcost.toFixed(2));
          }
          this.items = data;
        }
      }
    });
  }

  getProductList() {
    // get products list
    this.sub1 = this.inventoryservice.getAll().subscribe((products) => {
      // add to existing item dropdown
      this.productslist = [];
      this.productslist.push({ label: "Please Select", value: null });
      for (var i = 0; i < products.length; i++) {
        this.productslist.push({
          label: products[i].productcode + ": " + products[i].productname,
          value: products[i].id,
        });
      }
      //add to new item dropdown
      this.productslist_draft = [];
      this.productslist_draft.push({ label: "Please Select", value: null });
      for (var i = 0; i < products.length; i++) {
        this.productslist_draft.push({
          label: products[i].productcode + ": " + products[i].productname,
          value: products[i],
        });
      }
    });
  }

  additem(item, qty_field, total_field, table, modal) {
    var qty = qty_field.value;
    var total = total_field.value;
    if (qty == null || total == null || qty == "" || total == "") {
      swal("Error!", "Please enter the quantity and try again!", "warning");
    } else if (total == null || total == "" || total < 0.0) {
      swal(
        "Error!",
        "Please enter the Total Cost Amount and Try Again!",
        "warning"
      );
      return;
    } else {
      var obj = {
        po_id: this.id,
        product_id: item.id,
        quantity: qty,
        unitprice: total / qty,
        totalcost: total,
        uniquekey: this.uniqueid,
      };
      this.poservice.addPOItem(obj).subscribe(
        (data) => {
          if (data.status) {
            this.generateuniquekey();
            this.toastr.success("Item has been added", "Success !!", {
              positionClass: "toast-top-right",
              closeButton: true,
            });
            this.getData(this.id);
            modal.hide();
          } else {
            swal("Error!", data.err, "warning");
          }
        },
        (error) => {
          swal("API Error Occured. Try Again!");
        }
      );
      table.reset();
      total_field.value = null;
      qty_field.value = null;
    }
    // this.selectedclient = true;
  }

  edititem(updatingid, currentqty, currentcost, currenttotal) {
    if (this.po_data.status < 6) {
      this.updateitem = true;
      this.updatingid = updatingid;
      this.newqty = currentqty;
      this.newcost = currentcost;
      this.newtotal = currenttotal;
    }
  }

  updatecancel() {
    this.updatingid = null;
    this.updateitem = false;
    this.calculated = false;
  }

  updateItem() {
    if (this.newqty > 0 && this.newcost >= 0 && this.newtotal >= 0) {
      var obj = {
        uniquekey: this.uniqueid,
        id: this.updatingid,
        newquantity: this.newqty,
        newtotal: this.newtotal,
        newunitcost: this.newcost,
        discount: this.newdiscount,
        discount_type: this.newdiscount_type,
      };

      this.poservice.editPOitem(obj).subscribe(
        (data) => {
          if (data.status) {
            this.generateuniquekey();

            this.toastr.success("Item has been updated", "Success !!", {
              positionClass: "toast-top-right",
              closeButton: true,
            });

            this.getData(this.id);
            this.updatingid = null;
            this.updateitem = false;
          } else {
            swal("Error!", data.err, "warning");
          }
        },
        (error) => {
          swal("API Error Occured. Try Again!");
        }
      );
    }
  }

  deleteItem(item, index) {
    if (item.id == null) {
      this.items.splice(index, 1);
    } else {
      swal({
        title: "Are You sure?",
        text:
          "Please confirm that you want to delete this Product from Purchase Order?",
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
          this.poservice.deletePOitem(item.id, this.uniqueid).subscribe(
            (data) => {
              if (data.status) {
                this.generateuniquekey();
                this.getData(this.id);
                this.toastr.success("Item has been deleted", "Success !!", {
                  positionClass: "toast-top-right",
                  closeButton: true,
                });
              } else {
                swal("Error Occured." + data.err);
              }
            },
            (error) => {
              swal("API Error Occured. Try Again!");
            }
          );
        }
      });
    }
  }

  changeStatus(status: number) {
    if (this.items.length > 0 || status == -4) {
      var statusstring;
      if (status == -4) {
        statusstring = "Rejected";
      } else if (status == -2) {
        statusstring = "On Hold";
      } else if (status == 0) {
        statusstring = "Pending";
      } else if (status == 2) {
        statusstring = "SK Reviewed";
      } else if (status == 4) {
        statusstring = "Cost Reviewed";
      } else if (status == 6) {
        statusstring = "HO Approved";
      } else if (status == 8) {
        statusstring = "Order Placed";
      } else if (status == 10) {
        statusstring = "Completed";
      } else if (status == -6) {
        statusstring = "Cancelled";
      }

      swal({
        title: "Are You sure?",
        text:
          "Please confirm that you want to update status to: " + statusstring,
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
          this.poservice.updateStatus(this.id, status, this.uniqueid).subscribe(
            (data) => {
              if (data.status) {
                this.generateuniquekey();
                this.getData(this.id);
                this.toastr.success("Status has been updated", "Success !!", {
                  positionClass: "toast-top-right",
                  closeButton: true,
                });
              } else {
                swal("Error Occured." + data.err);
              }
            },
            (error) => {
              swal("API Error Occured. Try Again!");
            }
          );
        }
      });
    } else {
      swal("Item list is empty.");
    }
  }

  addLine(lines) {
    this.validated = false;
    this.draft_data = true;
    //save previous entries
    for (let item of this.items) {
      if (item.id == null) {
        if (item.net_total != null) {
          item.totalcost = item.net_total;
          item.unitcost = item.totalcost / item.quantity;
          item.input_enabled = false;
        }
      }
    }

    //add line
    for (let i = 0; i < lines; i++) {
      this.items.push({
        id: null,
        product_id: null,
        quantity: null,
        unitcost: null,
        totalcost: null,
        net_total: null,
        expense_amount: 0,
        input_enabled: true,
        synced_status: false,
      });
    }
    // this.calculateTotal();
  }

  enableInputs(item) {
    if (this.po_data.status != 10) {
      item.input_enabled = true;
      this.validated = false;
    }
  }

  itemDataAltered(item) {
    item.synced_status = false;
    this.draft_data = true;
  }

  discardChanges(item) {
    if (item.id != null) {
      if (item.synced_status == true) {
        item.input_enabled = false;
      } else {
        this.getPoitems();
        this.draft_data = false;
      }
    } else {
      this.draft_data = true;
    }
  }

  saveItem(item, index) {
    //validation
    if (
      item.product_id == null ||
      item.quantity == null ||
      item.net_total == null
    ) {
      swal("Error!", "Please enter valid inputs and try again!", "warning");
      return;
    }
    let obj = {
      id: item.id,
      newproduct: item.product_id.id,
      newquantity: item.quantity,
      newtotal: item.net_total,
      newunitcost: item.net_total / item.quantity,
      uniquekey: this.uniqueid,
    };

    this.poservice.editPOitem(obj).subscribe(
      (data) => {
        if (data.status) {
          this.generateuniquekey();
          this.getData(this.id);

          this.toastr.success("Item has been updated", "Success !!", {
            positionClass: "toast-top-right",
            closeButton: true,
          });
          // assign new po data
          this.po_data = data.po;
          this.draft_data = false;
          this.items[index] = data.item;
        } else {
          swal("Error!", data.err, "warning");
        }
      },
      (error) => {
        swal("API Error Occured. Try Again!");
      }
    );
  }

  validateAndSave() {
    //clear empty rows
    this.clearEmptyrows();
    //validate entry
    this.validated = true;
    for (let i = 0; i < this.items.length; i++) {
      //validating draft entries
      if (this.items[i].id == null) {
        this.items[i].totalcost = this.items[i].net_total;
        //if any field is empty, highlight cell
        if (
          this.items[i].product_id == null ||
          this.items[i].quantity == null ||
          this.items[i].net_total == null
        ) {
          //close input
          this.validated = false;
          this.items[i].input_enabled = false;
        } else {
          this.items[i].unitcost =
            this.items[i].totalcost / this.items[i].quantity;

          //close input
          this.items[i].input_enabled = false;
        }
      }
    }
    //add entries
    this.addNewItems();
  }

  addNewItems() {
    if (this.validated) {
      let items_list = [];
      for (let item of this.items) {
        if (item.id == null) {
          items_list.push({
            product_id: item.product_id.id,
            quantity: item.quantity,
            totalcost: item.totalcost,
          });
        }
      }
      let obj = {
        po_id: this.id,
        items: items_list,
        uniquekey: this.uniqueid,
      };
      this.poservice.addPOItem(obj).subscribe(
        (data) => {
          if (data.status) {
            this.generateuniquekey();

            this.toastr.success("Item has been added", "Success !!", {
              positionClass: "toast-top-right",
              closeButton: true,
            });
            this.getData(this.id);
            this.draft_data = false;
          } else {
            swal("Error!", data.err, "warning");
            this.draft_data = false;
          }
        },
        (error) => {
          swal("API Error Occured. Try Again!");
        }
      );
    } else {
      swal("Error!", "Please enter valid entries and try again!", "warning");
    }
  }

  clearEmptyrows() {
    for (let i = 0; i < this.items.length; i++) {
      if (
        this.items[i].product_id == null ||
        this.items[i].quantity == null ||
        this.items[i].net_total == null
      ) {
        //draft items
        if (this.items[i].id == null) {
          //close input
          // this.items[i].input_enabled = false;
          //remove completely empty entries
          if (
            this.items[i].product_id == null &&
            this.items[i].quantity == null &&
            this.items[i].net_total == null
          ) {
            this.items.splice(i, 1);
            i--;
          }
        } else {
          // this.items[i].input_enabled = false;
        }
      } else {
        //close input
        if (this.items[i].id == null) {
          // this.items[i].input_enabled = false;
          //if everything looks good
        }
      }
    }
  }

  openEditPoModel(modal) {
    var index = this.currencies.findIndex(
      (x) => x.id === this.po_data.currency.id
    );
    this.engineer = null;
    if (this.po_data?.engineer_name != null) {
      this.engineer = this.po_data?.engineer_name?.id;
    }
    this.project_name = this.po_data.project_name;

    if (index != -1) {
      this.currency = this.currencies[index];
      this.currency_rate = this.po_data.currency_rate;
    }
    modal.show();
  }
  setCurrencyRate() {
    if (this.currency != null) {
      this.currency_rate = this.currency.today_rate;
    }
  }
  editPo(modal) {
    if (this.currency == null) {
      swal("Error!", "Currency is required", "warning");
      return;
    }
    if (this.currency_rate == null) {
      swal("Error!", "Currency  Rate is required", "warning");
      return;
    }

    var obj = {
      id: this.id,
      currency: this.currency.id,
      currency_rate: this.currency_rate,
      engineer: this.engineer,
      project_name: this.project_name,
    };

    this.poservice.updatePoinfo(obj).subscribe(
      (data) => {
        if (data.status) {
          modal.hide();
          this.toastr.success("Purchase order has been updated", "Success !!", {
            positionClass: "toast-top-right",
            closeButton: true,
          });

          this.getData(this.id);
        } else {
          this.toastr.warning(data.err, "ERROR !!", {
            positionClass: "toast-top-right",
            closeButton: true,
          });
        }
      },
      (error) => {
        this.toastr.warning("API ERROR", "ERROR !!", {
          positionClass: "toast-top-right",
          closeButton: true,
        });
      }
    );
  }
  printPDF() {
    this.print_request = true;
    this.poservice.printPdf(this.id).subscribe((data) => {
      if (data.status) {
        printJS(GlobalVariable.BaseUrl + data.path);
        // var filename = this.purchaseorder_data.pcode
        // this.toaster = {
        //   type: "success",
        //   title: "Done!",
        //   text: "Print success!"
        // };
        // this.toasterService.pop(
        //   this.toaster.type,
        //   this.toaster.title,
        //   this.toaster.text
        // );
        this.print_request = false;
      } else {
        swal("Error Occured." + data.err);
        this.print_request = false;
      }
    });
  }

  editSpecificationModalShow(item, modal) {
    this.edit_specification_item = item;
    this.edit_specification = item.specification;
    modal.show();
  }
  editSpecification(modal) {
    var obj = {
      id: this.edit_specification_item.id,
      newspecification: this.edit_specification,
      uniquekey: this.uniqueid,
    };
    this.poservice.editItemSpecification(obj).subscribe((data) => {
      if (data.status) {
        this.toastr.success("Specification has been updated", "Success !!", {
          positionClass: "toast-top-right",
          closeButton: true,
        });
        this.getData(this.id);
        this.generateuniquekey();
        modal.hide();
      } else {
        swal("Error Occured." + data.err);
      }
    });
  }

  printpo(): void {
    //this.createprintinvoice();

    let printContents, popupWin;
    printContents = document.getElementById("printpo").innerHTML;
    popupWin = window.open("", "_blank", "top=0,left=0,height=100%,width=auto");
    popupWin.document.open();
    popupWin.document.write(`
          <html>
            <head>
              <title></title>
              <link rel="stylesheet" type="text/css"  href="../../../shared/styles/app.scss">
              <link rel="stylesheet" type="text/css"  href="../../../shared/styles/bootstrap.scss">
              <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
              <style type="text/css" media="print">

                @page {
	                
	                    size:  auto;   /* auto is the initial value */
	                    margin: 10mm;  /* this affects the margin in the printer settings */
	                  /*padding-top:250px*/
                }
                
                html{
	                    background-color: #FFFFFF; 
	                    margin: 0px;  /* this affects the margin on the html before sending to printer */
	            }
                
                body{
	               	margin: 5mm 5mm 5mm 10mm; /* margin you want for the content */
	            }
                
				.mr { margin-right: 10px !important; }
				.printhide { display: none;}
                
                header {
	                    /*position: fixed;*/
	                    /*top: 0;*/
	                    /*height: 250px;*/
	                    /*width:95%;*/
	                    border:1px solid #8c8c8c;
	            }
                
                footer{
						/*height: 220px;*/
						/*border:1px solid red;*/
						position: relative;
						bottom: 0;
						width: 95%;
						/*background-color: red;*/
						page-break-inside:avoid; 
					
				}
                
                .table>tbody>tr>td {
	                    padding-top: 2px !important;
	                    padding-bottom: 2px !important;
	                    padding-left: 8px !important;
	                    padding-right: 8px !important;
	
				}
				
				section{
						margin-top : 10px;
						width: 100%;
						overflow-x: visible !important;
				}
				
				.invoicewrapper{
					position:relative;
				}
				/* DivTable.com */
				.divTable{
					display: table;
					width: 100%;
					height: 100%;
				}
				.divTableRow {
					display: table-row;
				}
				.divTableHeading {
					background-color: #EEE;
					display: table-header-group;
				}
				.divTableCell, .divTableHead {
					border: 1px solid #d6d6d6;
					display: table-cell;
					padding: 1px 8px;
				}
				.divTableHeading {
					background-color: #EEE;
					display: table-header-group;
					font-weight: bold;
				}
				.divTableFoot {
					background-color: #EEE;
					display: table-footer-group;
					font-weight: bold;
				}
				.divTableBody {
					display: table-row-group;
				}

              </style>

            </head>
            <body onload="window.print()">${printContents}</body>
          </html>`);
    popupWin.document.close();
    setTimeout(function () {
      popupWin.close();
    }, 2000);
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.sub.unsubscribe();
  }

  purchaseOrderTermsEditModalShow(modal) {
    if (this.purchaseorder_data) {
      this.consignee_details = this.purchaseorder_data.consignee_details;
      this.delivery_address = this.purchaseorder_data.delivery_address;
      this.notify_party_1 = this.purchaseorder_data.notify_party_1;
      this.notify_party_2 = this.purchaseorder_data.notify_party_2;
      this.buyer = this.purchaseorder_data.buyer;
      this.marks_Nos = this.purchaseorder_data.marks_Nos;
    }
    modal.show();
  }

  updateQuotationTerms(modal) {
    var obj = {
      id: this.id,
      consignee_details: this.consignee_details,
      delivery_address: this.delivery_address,
      notify_party_1: this.notify_party_1,
      notify_party_2: this.notify_party_2,
      buyer: this.buyer,
      marks_Nos: this.marks_Nos,
    };
    this.poservice.editPurchaseOrdersTerms(obj).subscribe(
      (data) => {
        if (data.status) {
          modal.hide();

          this.toastr.success(
            "Quotation terms has been updated",
            "Success !!",
            {
              positionClass: "toast-top-right",
              closeButton: true,
            }
          );

          this.getData(this.id);
        } else {
          this.toastr.warning(data.err, "ERROR !!", {
            positionClass: "toast-top-right",
            closeButton: true,
          });
        }
      },
      (error) => {
        this.toastr.warning("API ERROR", "ERROR !!", {
          positionClass: "toast-top-right",
          closeButton: true,
        });
      }
    );
  }
  editInvoiceItemPercentageModalShow(modal) {
    this.edit_all_discount_type = "%";
    this.edit_all_discount = null;
    modal.show();
  }
  editInvoiceItemPercentage(modal) {
    if (this.edit_all_discount == null || this.edit_all_discount < 0) {
      swal("Error!", "Invalid Discount value", "warning");
      return;
    }

    if (this.edit_all_discount_type == "%") {
      if (this.edit_all_discount > 100) {
        swal(
          "Error!",
          "Discount cannot be higher than total Amount",
          "warning"
        );
        return;
      }
    } else {
      // for (let inv_item of this.invoice_items) {
      //   if (
      //     this.edit_all_discount >
      //     inv_item.unit_price * inv_item.total_quantity
      //   ) {
      //     swal(
      //       "Error!",
      //       "Discount cannot be higher than total price of any item",
      //       "warning"
      //     );
      //     return;
      //   }
      // }
      if (this.edit_all_discount > this.po_data.grosstotal) {
        swal(
          "Error!",
          "Discount cannot be higher than invoice gross total",
          "warning"
        );
        return;
      }
    }
    if (this.edit_all_discount_type == null) {
      swal("Error!", "Invalid Discount Type", "warning");
      return;
    }
    var obj = {
      id: this.id,
      all_discount: this.edit_all_discount,
      discount_type: this.edit_all_discount_type,
    };
    this.poservice.editAllInvoiceItemDiscount(obj).subscribe(
      (data) => {
        if (data.status) {
          modal.hide();
          this.toastr.success("Invoice Items has been updated", "Success !!", {
            positionClass: "toast-top-right",
            closeButton: true,
          });
          this.edit_all_discount = null;
          this.getData(this.id);
        } else {
          this.toastr.warning(data.err, "ERROR !!", {
            positionClass: "toast-top-right",
            closeButton: true,
          });
        }
      },
      (error) => {
        this.toastr.warning("API ERROR", "ERROR !!", {
          positionClass: "toast-top-right",
          closeButton: true,
        });
      }
    );
  }
}
