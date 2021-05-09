import { PurchaseOrderService } from "./../../../core/_services/purchaseorder.service";

import { Component, OnInit, OnDestroy } from "@angular/core";
import { User } from "../../../core/_models/user";
import { AuthenticationService } from "../../../core/_services/authentication.service";
import { SelectItem } from "primeng/components/common/selectitem";

@Component({
  selector: "app-purchase-order-summary",
  templateUrl: "./purchase-order-summary.component.html",
  styleUrls: ["./purchase-order-summary.component.scss"],
})
export class PurchaseOrderSummaryComponent implements OnInit, OnDestroy {
  sysuser: User;
  LoadUI: boolean = false;
  private sub1: any;
  po_list: any[];
  statusoptions: SelectItem[];

  cols: any[];

  constructor(
    private authservice: AuthenticationService,
    private poservice: PurchaseOrderService
  ) {}

  ngOnInit() {
    this.statusoptions = [];
    this.statusoptions.push({ label: "All", value: null });
    this.statusoptions.push({ label: "Rejected", value: -4 });
    this.statusoptions.push({ label: "ON Hold", value: -2 });
    this.statusoptions.push({ label: "Pending", value: 0 });
    this.statusoptions.push({ label: "SK Reviewed", value: 2 });
    this.statusoptions.push({ label: "Cost Reviewed", value: 4 });
    this.statusoptions.push({ label: "HO Approved", value: 6 });
    this.statusoptions.push({ label: "Order Placed", value: 8 });
    this.statusoptions.push({ label: "Completed", value: 10 });

    this.cols = [
      { field: "pocode", header: "Code" },
      { field: "supplier", header: "Supplier" },
      { field: "timestamp", header: " Created on" },
      { field: "createdby", header: "Created By" },
      { field: "status", header: "Status" },
      { field: "actions", header: "Actions", sortable: true },
    ];

    this.authservice.validateUser().subscribe((sysuser) => {
      this.sysuser = sysuser;
      this.LoadUI = true;
    });

    this.refreshData();
  }

  refreshData() {
    // get po  list
    this.sub1 = this.poservice.getAll().subscribe((polist) => {
      this.po_list = polist;
    });
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.sub1.unsubscribe();
  }
}
