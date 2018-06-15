import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import * as FusionCharts from 'fusioncharts';
import * as Charts from 'fusioncharts/fusioncharts.charts';
import * as FintTheme from 'fusioncharts/themes/fusioncharts.theme.fint';
import { FusionChartsModule } from 'angular4-fusioncharts';
import { FormsModule } from '@angular/forms';

FusionChartsModule.fcRoot(FusionCharts, Charts, FintTheme);

import { AppComponent } from './app.component';
import { PTEComponent } from './pte/pte.component';
import { LTEComponent } from './lte/lte.component';
import { OTEComponent } from './ote/ote.component';
import { MainComponent } from './main/main.component';
import { CoverComponent } from './cover/cover.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatNativeDateModule} from '@angular/material'
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatListModule} from '@angular/material/list';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatSelectModule} from '@angular/material/select';

export const routes: Routes = [
	{
	  path: 'data',
	  component: MainComponent,
	  pathMatch: 'full'
	},
  {
    path: '',
    component: CoverComponent,
    pathMatch: 'full'
  }
];

@NgModule({
  declarations: [
    AppComponent,
    PTEComponent,
    LTEComponent,
    OTEComponent,
    MainComponent,
    CoverComponent,
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes, { useHash: true }),
    FusionChartsModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    MatListModule,
    MatExpansionModule,
    MatSelectModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
