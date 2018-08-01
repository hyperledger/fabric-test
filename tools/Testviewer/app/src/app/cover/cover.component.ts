import { Component, OnInit, ViewChild } from '@angular/core'
import { PtechartService } from '../pte/ptechart.service'
import { OtechartService } from '../ote/otechart.service'
import { LtechartService } from '../lte/ltechart.service'
import { DateselectService } from '../main/dateselect.service'
import { testlists } from '../testlists'

@Component({
  selector: 'app-cover',
  templateUrl: './cover.component.html',
  styleUrls: ['./cover.component.css']
})
export class CoverComponent implements OnInit {

  @ViewChild('startdateinput') startdateinput
  @ViewChild('enddateinput') enddateinput
  @ViewChild('alertmessage') alertmessage

  constructor(private ptechartService: PtechartService, private otechartService: OtechartService, private ltechartService: LtechartService, private dateselectService: DateselectService) { }

  PTETests = testlists.pte.available
  OTETests = testlists.ote.available
  LTETests = testlists.lte.available

  id_invoke_line = 'ptechart_invoke_line'
  id_query_line = 'ptechart_query_line'
  id_ote_line = 'otechart_line'
  id_lte_line = 'ltechart_line'
  width = "50%"
  height = "300"
  type_line = 'msline'
  dataFormat = 'json'

  PTEdataSource = {
  	'invoke':{
  		'line':null
  	},
  	'query':{
  		'line':null
  	}
  }

  OTEdataSource
  LTEdataSource
  diameter

  loadPTE(startdate, enddate) {
    // Loads PTE chart using the PTEchart service
  	this.ptechartService.loadLineChart(startdate, enddate, this.PTETests)
    .then(([invokeline, queryline, diffinvokeline, diffqueryline]) => {
      invokeline.chart['showValues'] = 0
      queryline.chart['showValues'] = 0
      this.PTEdataSource.invoke.line = invokeline
      this.PTEdataSource.query.line = queryline
    })
    .catch(err => {
      this.diameter = 0
      throw err
    })
  }

  loadOTE(startdate, enddate) {
    // Loads OTE chart using the OTEchart service
  	this.otechartService.loadLineChart(startdate, enddate, this.OTETests)
  	.then(([line, diffline]) => {
  		line.chart['showValues'] = 0
  		this.OTEdataSource = line
  	})
    .catch(err => {
      this.diameter = 0
      throw err
    })
  }

  loadLTE(startdate, enddate) {
    // Loads LTE chart using the LTEchart service
  	this.ltechartService.loadLineChart(startdate, enddate, this.LTETests)
  	.then(([line, diffline]) => {
  		line.chart['showValues'] = 0
  		this.LTEdataSource = line
      this.diameter = 0
  	})
    .catch(err => {
      this.diameter = 0
      throw err
    })
  }

  loadCharts(startdate, enddate) {
    if (! this.dateselectService.validateDates(startdate, enddate)) {
      this.alertmessage.nativeElement.innerHTML = "Start date must be earlier than the end date!"
      return
    }
    else {
      this.alertmessage.nativeElement.innerHTML = ""
    }
    this.diameter = 50
  	this.loadPTE(startdate, enddate)
  	this.loadOTE(startdate, enddate)
  	this.loadLTE(startdate, enddate)
  }

  ngOnInit() {
  	let weekRange = this.dateselectService.weekRange()
    this.startdateinput.nativeElement.value = weekRange[0]
    this.enddateinput.nativeElement.value = weekRange[1]
  	this.loadCharts(this.startdateinput.nativeElement.value, this.enddateinput.nativeElement.value)
  }
}