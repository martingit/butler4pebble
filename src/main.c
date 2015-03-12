#include <pebble.h>

enum {
	AKEY_MODULE = 0x00,
	AKEY_ACTION = 0x01,
	AKEY_NAME = 0x02,
	AKEY_ID = 0x03,
  AKEY_STATUS = 0x04,
	AKEY_SERVERNAME = 0x05,
	AKEY_PORT = 0x06,
	AKEY_USEHTTPS = 0x07,
};

static Window *window;
static TextLayer *textLayer;
static BitmapLayer *bitmapLayer;
static GBitmap *logo;
static MenuLayer *menuLayer;
static char serverName[61];
static bool useHttps = false;
static int16_t port = 8081;
//static bool hasConfiguration = false;


#define MAX_DEVICE_LIST_ITEMS (30)
#define MAX_DEVICE_NAME_LENGTH (16)

typedef struct {
	int id;
	char name[MAX_DEVICE_NAME_LENGTH+1];
  bool status;
} Device;

static Device s_device_list_items[MAX_DEVICE_LIST_ITEMS];
static int s_device_count = 0;

void out_sent_handler(DictionaryIterator *sent, void *context) {
	APP_LOG(APP_LOG_LEVEL_DEBUG, "outgoing message was delivered");
}

void out_failed_handler(DictionaryIterator *failed, AppMessageResult reason, void *context) {
	APP_LOG(APP_LOG_LEVEL_DEBUG, "outgoing message failed");
}

void in_dropped_handler(AppMessageResult reason, void *context) {
	APP_LOG(APP_LOG_LEVEL_DEBUG, "incoming message dropped");
}

void setDevice(int id, char *name, bool status) {
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting device %i", id);
	if (s_device_count >= MAX_DEVICE_LIST_ITEMS) {
		return;
	}
	s_device_list_items[s_device_count].id = id;
  s_device_list_items[s_device_count].status = status;
  strncpy(s_device_list_items[s_device_count].name, name, MAX_DEVICE_NAME_LENGTH);
  s_device_count++;
}
void updateDevice(int id, bool status){
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Updating device %i", id);
  for(int i = 0; i < s_device_count; i++) {
    if (s_device_list_items[i].id == id){
      s_device_list_items[i].status = status;
    }
  }
}
/*void sendConfiguration(){
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Sending configuration");
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Configuration useHttps: %i, port: %i, serverName: %s", useHttps, port, serverName);
	DictionaryIterator *iter;
	app_message_outbox_begin(&iter);
	dict_write_cstring(iter, AKEY_MODULE, "configuration");
	dict_write_cstring(iter, AKEY_ACTION, "read");
	dict_write_cstring(iter, AKEY_SERVERNAME, serverName);
	dict_write_uint16(iter, AKEY_PORT, port);
	int16_t useHttpsValue = useHttps ? 1 : 0;
	dict_write_uint16(iter, AKEY_USEHTTPS, useHttpsValue);
	app_message_outbox_send();
}*/
void in_received_handler(DictionaryIterator *received, void *context) {
	APP_LOG(APP_LOG_LEVEL_DEBUG, "incoming message received");
// Check for fields you expect to receive
//	APP_LOG(APP_LOG_LEVEL_DEBUG, "%s", received);
	Tuple *moduleTuple = dict_find(received, AKEY_MODULE);
	Tuple *actionTuple = dict_find(received, AKEY_ACTION);
	if (!moduleTuple || !actionTuple) {
		APP_LOG(APP_LOG_LEVEL_DEBUG, "Malformed message");
		return;
	}
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Got module: %s, action: %s", moduleTuple->value->cstring, actionTuple->value->cstring);
	if (strcmp(moduleTuple->value->cstring, "device") == 0) {
    if (strcmp(actionTuple->value->cstring, "info") == 0) {
      layer_set_hidden(text_layer_get_layer(textLayer), true);
      layer_set_hidden(bitmap_layer_get_layer(bitmapLayer), true);
      layer_set_hidden(menu_layer_get_layer(menuLayer), false);
  		Tuple *idTuple = dict_find(received, AKEY_ID);
  		Tuple *nameTuple = dict_find(received, AKEY_NAME);
      Tuple *statusTuple = dict_find(received, AKEY_STATUS);
  		if (!idTuple || !nameTuple || !statusTuple) {
  			return;
  		}
  		setDevice(idTuple->value->int8, nameTuple->value->cstring, statusTuple->value->uint8);
  		menu_layer_reload_data(menuLayer);
    } else if (strcmp(actionTuple->value->cstring, "select") == 0) {
      Tuple *idTuple = dict_find(received, AKEY_ID);
      Tuple *statusTuple = dict_find(received, AKEY_STATUS);
      updateDevice(idTuple->value->int8, statusTuple->value->uint8);
      menu_layer_reload_data(menuLayer);
    }
  } else if (strcmp(moduleTuple->value->cstring, "error") == 0) {
    if (strcmp(actionTuple->value->cstring, "connection") == 0) {
      text_layer_set_text(textLayer, "Could not fetch devices :(");
      layer_set_hidden(menu_layer_get_layer(menuLayer), true);
      layer_set_hidden(text_layer_get_layer(textLayer), false);
      layer_set_hidden(bitmap_layer_get_layer(bitmapLayer), false);
    }
  }
}


static int16_t get_cell_height_callback(struct MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	return 44;
}

static void draw_row_callback(GContext* ctx, Layer *cell_layer, MenuIndex *cell_index, void *data) {
	Device* device;
	const int index = cell_index->row;
	device = &s_device_list_items[index];
	menu_cell_basic_draw(ctx, cell_layer, device->name, device->status ? "Status: On" : "Status: Off", NULL);
}

static uint16_t get_num_rows_callback(struct MenuLayer *menu_layer, uint16_t section_index, void *data) {
	return s_device_count;
}

static void select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	Device* device = &s_device_list_items[cell_index->row];
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Select callback, index: %i", cell_index->row);
	DictionaryIterator *iter;
	app_message_outbox_begin(&iter);
	dict_write_cstring(iter, AKEY_MODULE, "device");
	dict_write_cstring(iter, AKEY_ACTION, "select");
	dict_write_int(iter, AKEY_ID, &device->id, 4, true);
	int newStatus = device->status == 0 ? 1 : 0;
	dict_write_int(iter, AKEY_STATUS, &newStatus, 1, true);
	app_message_outbox_send();
}

static void select_long_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Select long callback, index: %i", cell_index->row);

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
	dict_write_cstring(iter, AKEY_MODULE, "device");
	dict_write_cstring(iter, AKEY_ACTION, "reload");
  app_message_outbox_send();

  text_layer_set_text(textLayer, "Reloading...");
  layer_set_hidden(text_layer_get_layer(textLayer), false);
  layer_set_hidden(bitmap_layer_get_layer(bitmapLayer), false);
  layer_set_hidden(menu_layer_get_layer(menuLayer), true);

  s_device_count = 0;
  for(int i = 0; i < MAX_DEVICE_LIST_ITEMS; i++)
  {
    s_device_list_items[i].id = -1;
    s_device_list_items[i].status = false;
    strncpy(s_device_list_items[i].name, "", MAX_DEVICE_NAME_LENGTH);
  }
}

static void window_load(Window *window) {
	Layer *windowLayer = window_get_root_layer(window);
	GRect bounds = layer_get_bounds(windowLayer);
	GRect frame = layer_get_frame(windowLayer);

	textLayer = text_layer_create((GRect) { .origin = { 0, 72 }, .size = { bounds.size.w, 40 } });
  bitmapLayer = bitmap_layer_create((GRect) { .origin = { (bounds.size.w/2)-(28/2), 28 }, .size = { 28, 28 } });
  logo = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_LOGO);
  bitmap_layer_set_bitmap(bitmapLayer, logo);
  bool hasBluetoothConnection = bluetooth_connection_service_peek();
  
	if (!hasBluetoothConnection) {
		text_layer_set_text(textLayer, "Not connected to phone!");
	} else {
		text_layer_set_text(textLayer, "Loading...");
	}
	text_layer_set_text_alignment(textLayer, GTextAlignmentCenter);
	text_layer_set_overflow_mode(textLayer, GTextOverflowModeWordWrap);
	layer_add_child(windowLayer, text_layer_get_layer(textLayer));
  layer_add_child(windowLayer, bitmap_layer_get_layer(bitmapLayer));
  
	menuLayer = menu_layer_create(frame);
	menu_layer_set_callbacks(menuLayer, NULL, (MenuLayerCallbacks) {
		.get_cell_height = (MenuLayerGetCellHeightCallback) get_cell_height_callback,
		.draw_row = (MenuLayerDrawRowCallback) draw_row_callback,
		.get_num_rows = (MenuLayerGetNumberOfRowsInSectionsCallback) get_num_rows_callback,
		.select_click = (MenuLayerSelectCallback) select_callback,
		.select_long_click = (MenuLayerSelectCallback) select_long_callback
	});
	menu_layer_set_click_config_onto_window(menuLayer, window);
	layer_set_hidden(menu_layer_get_layer(menuLayer), true);
	layer_add_child(windowLayer, menu_layer_get_layer(menuLayer));
}

static void window_unload(Window *window) {
	text_layer_destroy(textLayer);
}

static void init(void) {
	window = window_create();
	window_set_window_handlers(window, (WindowHandlers) {
		.load = window_load,
		.unload = window_unload,
	});
	const bool animated = true;

	window_stack_push(window, animated);

	app_message_register_inbox_received(in_received_handler);
	app_message_register_inbox_dropped(in_dropped_handler);
	app_message_register_outbox_sent(out_sent_handler);
	app_message_register_outbox_failed(out_failed_handler);

	const uint32_t inbound_size = 128;
	const uint32_t outbound_size = 128;
	app_message_open(inbound_size, outbound_size);
}

static void deinit(void) {
/*  app_message_deregister_callbacks();
  gbitmap_destroy(logo);
  bitmap_layer_destroy(bitmapLayer);
  text_layer_destroy(textLayer);
  menu_layer_destroy(menuLayer);*/
	window_destroy(window);
}

int main(void) {
	init();

	APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

	app_event_loop();
	deinit();
}