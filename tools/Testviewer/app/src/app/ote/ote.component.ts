import { Component, OnInit, SimpleChanges, SimpleChange, Input, ViewChild } from '@angular/core'
import { serverurl } from '../serveraction'
import { OtechartService } from './otechart.service'
import { DateselectService } from '../main/dateselect.service'
import { testlists } from '../testlists'

@Component({
  selector: 'app-ote',
  templateUrl: './ote.component.html',
  styleUrls: ['./ote.component.css']
})
export class OTEComponent implements OnInit {
  title = 'OTE Metrics'

  //// VARIABLES

  objectkeys = Object.keys
  tests = {}
  test_toadd = testlists.ote.available
  options = 0
  buildnum
  private chosendate
  selectedOptions
  numpassing
  numfailing

  //// INPUTS

  @ViewChild("startdateinput") startdateinput
  @ViewChild("enddateinput") enddateinput
  @ViewChild("dateinput") dateinput

  //// CHART INFORMATION

  id_line = 'otechart_line'
  id_differentialline = 'otechart_diff_line'
  width = "100%"
  height = "600"
  type_line = 'msline'
  dataFormat = 'json'
  dataSource_line
  dataSource_differentialline

  constructor(private otechartService: OtechartService, private dateselectService: DateselectService) { }

  addTest(fabnumber) {
    // Creates test object with given fab number

  	this.tests[fabnumber] = {
  		'fab':null,
	  	'status':null,
	  	'txreq':null,
	  	'txack':null,
	  	'txnack':null,
	  	'delivblk':null,
	  	'delivtx':null,
	  	'numch':null,
	  	'batchsize':null,
	  	'tps':null,
      'values':[],
      'stats':{
          'min':null,
          'mean':null,
          'max':null,
          'prange':null
        }
  	}
  }

  loadTests() {
    this.tests = {}
    for (let test of this.selectedOptions) {
      this.addTest(test)
    }
  }

  updateDate() {
    this.dateselectService.updateChosenDate(this.dateinput.nativeElement.value, 'ote')
    .then(obj => {
      this.chosendate = obj.chosendate
      this.buildnum = obj.build
      this.getData(obj.build)
    })
  }

  getData(build) {
    // Fetches data of all tests from server

  	for (let fabnum of this.selectedOptions) {
  		fetch(`${serverurl}/ote/${fabnum}/${build}` ,{
	       method:'GET',
	     })
       .then(res => res.json())
       .then(res => {
          if (res.success == true) {
            this.tests[fabnum].fab = res['fab']
            this.tests[fabnum].status = res['status']
            this.tests[fabnum].txreq = res['txreq']
            this.tests[fabnum].txack = res['ack']
            this.tests[fabnum].txnack = res['nack']
            this.tests[fabnum].delivblk = res['delivblk']
            this.tests[fabnum].delivtx = res['delivtx']
            this.tests[fabnum].numch = res['numch']
            this.tests[fabnum].batchsize = res['batchsize']
            this.tests[fabnum].tps = parseFloat(res['tps']).toFixed(2)
          }
          else {
            this.tests[fabnum].status = null
            this.tests[fabnum].txreq = null
            this.tests[fabnum].txack = null
            this.tests[fabnum].txnack = null
            this.tests[fabnum].delivblk = null
            this.tests[fabnum].delivtx = null
            this.tests[fabnum].numch = null
            this.tests[fabnum].batchsize = null
            this.tests[fabnum].tps = null
          }
          this.loadStatuses()
       })
       .catch(err => {
       		console.log("Logs may not be available yet!")
       		throw err
       })
  	}
  }

  loadCharts(startdate, enddate) {
    // Loads charts with given date range

    this.otechartService.loadLineChart(startdate, enddate, this.selectedOptions)
    .then(([line, diffline]) => {
      for (let i = 0; i < line.dataset.length; i++) {
        for (let datapoint of line.dataset[i].data) {
          this.tests[line.dataset[i].seriesname.split(" ")[0]].values.push(datapoint.value)
          datapoint.value = parseFloat(datapoint.value).toFixed(2)
        }
        for (let datapoint of diffline.dataset[i].data) {
          datapoint.value = parseFloat(datapoint.value).toFixed(2)
        }
      }
      this.dataSource_line = line
      this.dataSource_differentialline = diffline
      this.loadStats()
    })
  }

  loadStats() {
    // Calculates and stores statistics

    for (let fabnum of this.selectedOptions) {
      let i_max = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.max(a,b)})),
          i_min = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.min(a,b)})),
          i_mean = (parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return parseFloat(a)+parseFloat(b)})) / this.tests[fabnum].values.length)
      this.tests[fabnum].max = i_max.toFixed(2)
      this.tests[fabnum].min = i_min.toFixed(2)
      this.tests[fabnum].mean = i_mean.toFixed(2)
      this.tests[fabnum].prange = (((i_min - i_mean)/i_mean) * 100).toFixed(2) + "% ~ +" + (((i_max - i_mean)/i_mean) * 100).toFixed(2) + "%"

      let q_max = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.max(a,b)})),
          q_min = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.min(a,b)})),
          q_mean = (parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return parseFloat(a)+parseFloat(b)})) / this.tests[fabnum].values.length)

      this.tests[fabnum].max = q_max.toFixed(2)
      this.tests[fabnum].min = q_min.toFixed(2)
      this.tests[fabnum].mean = q_mean.toFixed(2)
      this.tests[fabnum].prange = (((q_min - q_mean)/q_mean) * 100).toFixed(2) + "% ~ +" + (((q_max - q_mean)/q_mean) * 100).toFixed(2) + "%"
    }
  }

  loadStatuses() {
    // Counts number passing and number failing

    let passing = 0,
        failing = 0;
    for (let fab of this.selectedOptions) {
      if (this.tests[fab].status == "PASSED") {
        passing += 1
      }
      else if (this.tests[fab].status == "FAILED") {
        failing += 1
      }
    }
    this.numpassing = passing
    this.numfailing = failing
  }

  loadAll(startdate, enddate) {
    this.loadTests()
    this.updateDate()
    // Checks if end date is valid i.e. today's test is done and logs are available

    fetch(`${serverurl}/build/ote`, {method:'GET'})
    .then(res => res.json())
    .then(res => {
      let endbuild = res[this.dateselectService.convertDateFormat(enddate)]
      this.dateselectService.checkEndDate(`${serverurl}/ote/${this.test_toadd[0]}/${endbuild}`)
      .then(bool => {
        if (bool == true) {
          this.loadCharts(startdate, enddate)  
        }
        else {
          // If logs unavailable, set end date to previous day
          let lastday = new Date(enddate)
          let prevday = new Date(lastday.setDate(lastday.getDate() - 1))
          this.enddateinput.nativeElement.value = [prevday.getMonth()+1, prevday.getDate(), prevday.getFullYear()].join('/')
          this.loadCharts(startdate, this.enddateinput.nativeElement.value)  
        }
      })
    })
  }

  ngOnInit() {
    //// Init chosen tests to load
    this.selectedOptions = testlists.ote.selected

    //// Init chart's date range values
    let weekRange = this.dateselectService.weekRange()
    this.startdateinput.nativeElement.value = weekRange[0]
    this.enddateinput.nativeElement.value = weekRange[1]

    //// Init single day data's date value
    let today = this.dateselectService.getToday()
    this.dateinput.nativeElement.value = today
    this.chosendate = this.dateselectService.convertDateFormat(today)

    //// Load charts and data
  	this.loadAll(weekRange[0],weekRange[1])
  }
}